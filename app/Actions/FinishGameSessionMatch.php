<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\MatchResultProcessor;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionState;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinishGameSessionMatch
{
    public function __construct(
        private MatchResultProcessor $matchResultProcessor,
        private QueueingSessionState $queueingSessionState,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftState $draftState,
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    public function execute(
        GameSession $session,
        ?int $team1Score,
        ?int $team2Score,
        ?int $queueingSessionMatchId = null,
        ?int $winningTeamOverride = null,
    ): GameSession {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if ($session->isQueueing() && $session->isDraft()) {
            return $this->finishDraftMatch($session, $team1Score, $team2Score, $queueingSessionMatchId, $winningTeamOverride);
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $team1Score, $team2Score, $required, $queueingSessionMatchId, $winningTeamOverride): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'ongoing') {
                abort(422, 'No match is in progress for this session.');
            }

            [$winningTeam, $storedTeam1Score, $storedTeam2Score, $margin] = $this->resolveScores(
                $locked,
                $team1Score,
                $team2Score,
                $winningTeamOverride,
            );

            $playing = collect();
            $teamMap = [];
            $targetQueueingMatch = null;

            if ($locked->isQueueing()) {
                $targetQueueingMatch = QueueingSessionMatch::query()
                    ->where('game_session_id', $locked->id)
                    ->where('status', 'ongoing')
                    ->when(
                        $queueingSessionMatchId !== null,
                        fn ($q) => $q->whereKey($queueingSessionMatchId),
                    )
                    ->latest('id')
                    ->lockForUpdate()
                    ->first();

                if (! $targetQueueingMatch) {
                    abort(422, 'No ongoing queueing match found to finish.');
                }

                [$playing, $teamMap] = $this->resolveQueueingMatchLineup($locked, $targetQueueingMatch, $required);
            } else {
                /** @var Collection<int, GameSessionPlayer> $playing */
                $playing = GameSessionPlayer::query()
                    ->where('game_session_id', $locked->id)
                    ->where('is_playing', true)
                    ->orderBy('queue_position')
                    ->lockForUpdate()
                    ->with('user:id,name')
                    ->get();

                if ($playing->count() !== $required) {
                    abort(422, 'The playing lineup does not match the match type.');
                }

                $teamMap = $this->resolveTeams($playing, $locked->match_type);
            }

            $breakdown = $this->matchResultProcessor->processMatch(
                $locked,
                $playing,
                $teamMap,
                $winningTeam,
                $margin,
                $storedTeam1Score,
                $storedTeam2Score,
                persistGlobalEffects: true,
            );

            if ($locked->isQueueing()) {
                $targetQueueingMatch->update([
                    'status' => 'finished',
                    'team1_score' => $storedTeam1Score,
                    'team2_score' => $storedTeam2Score,
                    'winning_team' => $winningTeam,
                    'finished_at' => now(),
                    'result_breakdown' => $breakdown,
                ]);

                foreach ($playing as $p) {
                    GameSessionPlayer::query()->whereKey($p->id)->update([
                        'is_playing' => false,
                        'is_waiting' => true,
                        'team' => null,
                    ]);
                }
                $this->matchResultProcessor->applyLastMatchResults($breakdown, (int) $targetQueueingMatch->id);
                $this->queueingSessionState->recompactQueuePositions($locked->id);
                $this->queueingSessionState->clearOrphanPlayingPlayers((int) $locked->id);

                $sessionStatus = $this->queueingSessionState->hasOngoingMatch((int) $locked->id)
                    ? 'ongoing'
                    : 'queueing';

                GameSession::query()->whereKey($locked->id)->update([
                    'status' => $sessionStatus,
                    'is_active' => true,
                    'last_team1_score' => $storedTeam1Score,
                    'last_team2_score' => $storedTeam2Score,
                    'last_winning_team' => $winningTeam,
                    'last_finished_at' => now(),
                    'last_result_breakdown' => $breakdown,
                ]);
                GameSession::query()->whereKey($locked->id)->increment('completed_matches_count');
            } else {
                $this->releasePlayersAfterSessionEnded($locked->id);

                GameSession::query()->whereKey($locked->id)->update([
                    'status' => 'finished',
                    'is_active' => false,
                    'ended_at' => now(),
                    'last_team1_score' => $storedTeam1Score,
                    'last_team2_score' => $storedTeam2Score,
                    'last_winning_team' => $winningTeam,
                    'last_finished_at' => now(),
                    'last_result_breakdown' => $breakdown,
                ]);
            }

            return $locked->fresh();
        });
    }

    private function finishDraftMatch(
        GameSession $session,
        ?int $team1Score,
        ?int $team2Score,
        ?int $queueingSessionMatchId,
        ?int $winningTeamOverride,
    ): GameSession {
        $required = $session->match_type === 'doubles' ? 4 : 2;

        return $this->draftStore->mutate($session, function ($draft) use ($session, $team1Score, $team2Score, $queueingSessionMatchId, $winningTeamOverride, $required) {
            if (($draft->sessionMeta['status'] ?? 'queueing') !== 'ongoing' && ! $draft->hasOngoingMatch()) {
                abort(422, 'No match is in progress for this session.');
            }

            [$winningTeam, $storedTeam1Score, $storedTeam2Score, $margin] = $this->resolveScores(
                $session,
                $team1Score,
                $team2Score,
                $winningTeamOverride,
            );

            $targetMatch = collect($draft->matches)
                ->filter(fn (array $m): bool => ($m['status'] ?? '') === 'ongoing')
                ->when($queueingSessionMatchId !== null, fn ($c) => $c->where('id', $queueingSessionMatchId))
                ->sortByDesc('id')
                ->first();

            if ($targetMatch === null) {
                abort(422, 'No ongoing queueing match found to finish.');
            }

            $pickedArrays = $this->draftLineup->playersFromOngoingLineup($session, $targetMatch, $required, $draft);
            $playing = collect($pickedArrays)->map(function (array $row) use ($session): GameSessionPlayer {
                $player = new GameSessionPlayer([
                    'game_session_id' => $session->id,
                    'user_id' => $row['user_id'] ?? null,
                    'guest_name' => $row['guest_name'] ?? null,
                    'queue_position' => (int) ($row['queue_position'] ?? 0),
                    'team' => $row['team'] ?? null,
                    'wins_count' => (int) ($row['wins_count'] ?? 0),
                    'losses_count' => (int) ($row['losses_count'] ?? 0),
                    'session_points' => (int) ($row['session_points'] ?? 0),
                ]);
                $player->id = (int) $row['id'];
                $player->exists = true;

                return $player;
            })->values();

            $teamMap = $this->teamMapFromLineupRows($session, $pickedArrays, $playing);

            $breakdown = $this->matchResultProcessor->processMatch(
                $session,
                $playing,
                $teamMap,
                $winningTeam,
                $margin,
                $storedTeam1Score,
                $storedTeam2Score,
                persistGlobalEffects: false,
            );

            $this->matchResultProcessor->applyBreakdownToDraftPlayers($draft->players, $teamMap, $breakdown, (int) $targetMatch['id']);

            $matchId = (int) $targetMatch['id'];
            $playerIds = $playing->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $this->draftState->returnPlayersToQueue($draft, $playerIds);

            $this->draftState->updateMatchInDraft($draft, $matchId, [
                'status' => 'finished',
                'team1_score' => $storedTeam1Score,
                'team2_score' => $storedTeam2Score,
                'winning_team' => $winningTeam,
                'finished_at' => now()->toIso8601String(),
                'result_breakdown' => $breakdown,
            ]);

            $draft->sessionMeta['completed_matches_count'] = (int) ($draft->sessionMeta['completed_matches_count'] ?? 0) + 1;
            $draft->sessionMeta['last_team1_score'] = $storedTeam1Score;
            $draft->sessionMeta['last_team2_score'] = $storedTeam2Score;
            $draft->sessionMeta['last_winning_team'] = $winningTeam;
            $draft->sessionMeta['last_finished_at'] = now()->toIso8601String();
            $draft->sessionMeta['last_result_breakdown'] = $breakdown;

            $this->draftState->clearOrphanPlayingPlayers($draft);
            $this->draftState->syncSessionMetaStatus($draft);

            return $draft;
        });
    }

    /**
     * @return array{0: int, 1: ?int, 2: ?int, 3: int}
     */
    private function resolveScores(
        GameSession $session,
        ?int $team1Score,
        ?int $team2Score,
        ?int $winningTeamOverride,
    ): array {
        $useWinnerOnly = $session->isQueueing() && (bool) $session->skip_scores;

        if ($useWinnerOnly) {
            if (! in_array($winningTeamOverride, [1, 2], true)) {
                abort(422, 'Select the winning team.');
            }

            return [$winningTeamOverride, null, null, 0];
        }

        if ($team1Score === null || $team2Score === null) {
            abort(422, 'Enter both final scores.');
        }
        if ($team1Score === $team2Score) {
            abort(422, 'Scores cannot be tied.');
        }

        $winningTeam = $team1Score > $team2Score ? 1 : 2;

        return [$winningTeam, $team1Score, $team2Score, abs($team1Score - $team2Score)];
    }

    /**
     * @return array{0: Collection<int, GameSessionPlayer>, 1: array<int, int>}
     */
    private function resolveQueueingMatchLineup(
        GameSession $session,
        QueueingSessionMatch $match,
        int $required,
    ): array {
        $lineup = is_array($match->lineup) ? $match->lineup : [];
        $playerIds = collect($lineup)
            ->pluck('game_session_player_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values();

        if ($playerIds->count() !== $required || $playerIds->unique()->count() !== $required) {
            abort(422, 'The selected match lineup is invalid.');
        }

        /** @var Collection<int, GameSessionPlayer> $playing */
        $playing = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->whereIn('id', $playerIds->all())
            ->where('is_playing', true)
            ->lockForUpdate()
            ->with('user:id,name')
            ->get()
            ->sortBy(fn (GameSessionPlayer $p): int => (int) $playerIds->search((int) $p->id))
            ->values();

        if ($playing->count() !== $required) {
            abort(422, 'Some players in this match are no longer active on court.');
        }

        $lineupTeams = collect($lineup)
            ->mapWithKeys(function ($row): array {
                $pid = (int) ($row['game_session_player_id'] ?? 0);
                $team = isset($row['team']) ? (int) $row['team'] : null;
                if ($pid <= 0) {
                    return [];
                }

                return [$pid => $team];
            })
            ->all();

        if ($session->match_type === 'doubles') {
            $missing = $playing->contains(fn (GameSessionPlayer $p): bool => ! in_array($lineupTeams[$p->id] ?? null, [1, 2], true));
            if ($missing) {
                $allTeamsUnset = $playing->every(fn (GameSessionPlayer $p): bool => ! in_array($lineupTeams[$p->id] ?? null, [1, 2], true));
                if ($playing->count() === 4 && $allTeamsUnset) {
                    foreach ($playing as $index => $p) {
                        $lineupTeams[$p->id] = $index < 2 ? 1 : 2;
                    }
                } else {
                    abort(422, 'Doubles match lineup is missing team assignments.');
                }
            }
            $grouped = $playing->groupBy(fn (GameSessionPlayer $p): int => (int) ($lineupTeams[$p->id] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        $teamMap = $this->teamMapFromLineupTeams($session, $lineupTeams, $playing);

        return [$playing, $teamMap];
    }

    /**
     * @param  array<int, int|null>  $lineupTeams
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @return array<int, int>
     */
    private function teamMapFromLineupTeams(GameSession $session, array $lineupTeams, Collection $playing): array
    {
        $teamMap = [];
        foreach ($playing->values() as $index => $player) {
            if ($session->match_type === 'singles') {
                $team = $lineupTeams[$player->id] ?? null;
                $teamMap[$player->id] = in_array($team, [1, 2], true) ? (int) $team : ($index === 0 ? 1 : 2);
            } else {
                $teamMap[$player->id] = (int) $lineupTeams[$player->id];
            }
        }

        return $teamMap;
    }

    /**
     * @param  list<array<string, mixed>>  $lineupRows
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @return array<int, int>
     */
    private function teamMapFromLineupRows(
        GameSession $session,
        array $lineupRows,
        Collection $playing,
    ): array {
        $lineupTeams = [];
        foreach ($lineupRows as $index => $row) {
            $playerId = (int) ($row['id'] ?? 0);
            if ($playerId <= 0) {
                continue;
            }
            $team = $row['team'] ?? null;
            $lineupTeams[$playerId] = in_array($team, [1, 2], true)
                ? (int) $team
                : ($index === 0 ? 1 : 2);
        }

        return $this->teamMapFromLineupTeams($session, $lineupTeams, $playing);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @return array<int, int> game_session_players.id => 1|2
     */
    private function resolveTeams(Collection $playing, string $matchType): array
    {
        if ($matchType === 'singles') {
            if ($playing->count() !== 2) {
                abort(422, 'Singles requires exactly two players on court.');
            }

            $sorted = $playing->sortBy('queue_position')->values();
            $first = $sorted[0];
            $second = $sorted[1];
            $t1 = $first->team;
            $t2 = $second->team;

            if ($t1 !== null && $t2 !== null && (int) $t1 !== (int) $t2) {
                return [
                    $first->id => (int) $t1,
                    $second->id => (int) $t2,
                ];
            }

            return [
                $first->id => 1,
                $second->id => 2,
            ];
        }

        $missingTeam = $playing->contains(fn (GameSessionPlayer $p): bool => $p->team === null);
        if ($missingTeam) {
            abort(422, 'Doubles requires each player to have a team assigned.');
        }

        $g = $playing->groupBy(fn (GameSessionPlayer $p): int => (int) $p->team);
        if ($g->count() !== 2 || $g->get(1)?->count() !== 2 || $g->get(2)?->count() !== 2) {
            abort(422, 'Doubles requires two players on team 1 and two on team 2.');
        }

        return $playing->mapWithKeys(fn (GameSessionPlayer $p): array => [$p->id => (int) $p->team])->all();
    }

    private function releasePlayersAfterSessionEnded(int $sessionId): void
    {
        GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->update([
                'is_playing' => false,
                'is_waiting' => false,
            ]);
    }
}
