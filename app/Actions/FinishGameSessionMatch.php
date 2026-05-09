<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Services\EloCalculator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinishGameSessionMatch
{
    public function __construct(
        private EloCalculator $elo,
        private CreditMemberPointWallet $creditMemberPointWallet,
    ) {}

    public function execute(GameSession $session, int $team1Score, int $team2Score, ?int $queueingSessionMatchId = null): GameSession
    {
        if ($team1Score === $team2Score) {
            abort(422, 'Scores cannot be tied.');
        }

        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $team1Score, $team2Score, $required, $queueingSessionMatchId): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'ongoing') {
                abort(422, 'No match is in progress for this session.');
            }

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

            $winningTeam = $team1Score > $team2Score ? 1 : 2;
            $margin = abs($team1Score - $team2Score);

            $breakdown = $this->applyResults(
                $locked,
                $playing,
                $teamMap,
                $winningTeam,
                $margin,
                $team1Score,
                $team2Score,
            );

            if ($locked->isQueueing()) {
                $targetQueueingMatch->update([
                    'status' => 'finished',
                    'team1_score' => $team1Score,
                    'team2_score' => $team2Score,
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
                $this->recompactQueuePositions($locked->id);
                $stillHasOngoingPlayers = GameSessionPlayer::query()
                    ->where('game_session_id', $locked->id)
                    ->where('is_playing', true)
                    ->exists();

                GameSession::query()->whereKey($locked->id)->update([
                    'status' => $stillHasOngoingPlayers ? 'ongoing' : 'queueing',
                    'is_active' => true,
                    'last_team1_score' => $team1Score,
                    'last_team2_score' => $team2Score,
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
                    'last_team1_score' => $team1Score,
                    'last_team2_score' => $team2Score,
                    'last_winning_team' => $winningTeam,
                    'last_finished_at' => now(),
                    'last_result_breakdown' => $breakdown,
                ]);
            }

            return $locked->fresh();
        });
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
                abort(422, 'Doubles match lineup is missing team assignments.');
            }
            $grouped = $playing->groupBy(fn (GameSessionPlayer $p): int => (int) ($lineupTeams[$p->id] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        $teamMap = [];
        foreach ($playing as $index => $player) {
            if ($session->match_type === 'singles') {
                $teamMap[$player->id] = $index === 0 ? 1 : 2;
            } else {
                $teamMap[$player->id] = (int) $lineupTeams[$player->id];
            }
        }

        return [$playing, $teamMap];
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

    /**
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @param  array<int, int>  $teamMap
     * @return array<string, mixed>
     */
    private function applyResults(
        GameSession $session,
        Collection $playing,
        array $teamMap,
        int $winningTeam,
        int $margin,
        int $team1Score,
        int $team2Score,
    ): array {
        $sportId = (int) $session->sport_id;
        $memberUserIds = $playing->pluck('user_id')->filter()->unique()->values()->all();

        foreach ($memberUserIds as $uid) {
            Ranking::query()->firstOrCreate(
                [
                    'user_id' => $uid,
                    'sport_id' => $sportId,
                ],
                ['rating' => 1000],
            );
        }

        $ratingsBefore = Ranking::query()
            ->where('sport_id', $sportId)
            ->whereIn('user_id', $memberUserIds)
            ->orderBy('user_id')
            ->lockForUpdate()
            ->get()
            ->mapWithKeys(fn (Ranking $r): array => [(int) $r->user_id => (int) $r->rating])
            ->all();

        $deltas = $session->match_type === 'doubles'
            ? $this->computeDoublesDeltas($playing, $teamMap, $winningTeam, $ratingsBefore)
            : $this->computeSinglesDeltas($playing, $teamMap, $winningTeam, $ratingsBefore);

        $rows = [];
        foreach ($playing as $player) {
            $playerTeam = $teamMap[$player->id];
            $won = $playerTeam === $winningTeam;
            $pk = $player->id;
            $isGuest = $player->isGuest();

            if ($isGuest) {
                if ($won) {
                    GameSessionPlayer::query()->whereKey($pk)->increment('wins_count');
                } else {
                    GameSessionPlayer::query()->whereKey($pk)->increment('losses_count');
                }

                $rows[] = [
                    'user_id' => null,
                    'guest_name' => $player->guest_name,
                    'name' => $player->displayName(),
                    'team' => $playerTeam,
                    'won' => $won,
                    'rating_before' => null,
                    'rating_after' => null,
                    'rating_change' => null,
                    'session_points_earned' => 0,
                ];

                continue;
            }

            $uid = (int) $player->user_id;
            $delta = $deltas[$uid] ?? 0;
            $before = $ratingsBefore[$uid] ?? 1000;
            $after = $before + $delta;

            $sessionPointsEarned = $this->resolveSessionPointsEarned($session, $won, $margin);

            Ranking::query()->updateOrCreate(
                [
                    'user_id' => $uid,
                    'sport_id' => $sportId,
                ],
                ['rating' => $after],
            );

            RatingHistory::query()->create([
                'user_id' => $uid,
                'sport_id' => $sportId,
                'game_session_id' => $session->id,
                'rating_before' => $before,
                'rating_after' => $after,
                'rating_change' => $after - $before,
            ]);

            GameSessionPlayer::query()->whereKey($pk)->increment('session_points', $sessionPointsEarned);
            $this->creditMemberPointWallet->execute(
                $uid,
                $sportId,
                $sessionPointsEarned,
                (int) $session->id,
            );
            if ($won) {
                GameSessionPlayer::query()->whereKey($pk)->increment('wins_count');
            } else {
                GameSessionPlayer::query()->whereKey($pk)->increment('losses_count');
            }

            $rows[] = [
                'user_id' => $uid,
                'name' => $player->user?->name ?? 'Player',
                'team' => $playerTeam,
                'won' => $won,
                'rating_before' => $before,
                'rating_after' => $after,
                'rating_change' => $after - $before,
                'session_points_earned' => $sessionPointsEarned,
            ];
        }

        return [
            'winning_team' => $winningTeam,
            'team1_score' => $team1Score,
            'team2_score' => $team2Score,
            'players' => $rows,
        ];
    }

    private function resolveSessionPointsEarned(GameSession $session, bool $won, int $margin): int
    {
        if ($session->isQueueing()) {
            $w = (int) ($session->win_points ?? 30);
            $l = (int) ($session->loss_points ?? 8);

            return $won ? $w : $l;
        }

        return $won
            ? 25 + min(10, $margin)
            : 8;
    }

    /**
     * @param  array<int, int>  $teamMap
     * @param  array<int, int>  $ratingsBefore  user_id => rating
     * @return array<int, int> user_id => delta
     */
    private function computeSinglesDeltas(
        Collection $playing,
        array $teamMap,
        int $winningTeam,
        array $ratingsBefore,
    ): array {
        $sorted = $playing->sortBy('queue_position')->values();
        $a = $sorted[0];
        $b = $sorted[1];

        if ($a->user_id === null && $b->user_id === null) {
            return [];
        }

        $out = [];

        if ($a->user_id !== null) {
            $uid = (int) $a->user_id;
            $rSelf = (float) ($ratingsBefore[$uid] ?? 1000);
            $oppRating = $b->user_id !== null
                ? (float) ($ratingsBefore[(int) $b->user_id] ?? 1000)
                : 1000.0;
            $scoreA = $teamMap[$a->id] === $winningTeam ? 1.0 : 0.0;
            $out[$uid] = $this->elo->delta($rSelf, $oppRating, $scoreA);
        }

        if ($b->user_id !== null) {
            $uid = (int) $b->user_id;
            $rSelf = (float) ($ratingsBefore[$uid] ?? 1000);
            $oppRating = $a->user_id !== null
                ? (float) ($ratingsBefore[(int) $a->user_id] ?? 1000)
                : 1000.0;
            $scoreB = $teamMap[$b->id] === $winningTeam ? 1.0 : 0.0;
            $out[$uid] = $this->elo->delta($rSelf, $oppRating, $scoreB);
        }

        return $out;
    }

    /**
     * @param  array<int, int>  $teamMap
     * @param  array<int, int>  $ratingsBefore
     * @return array<int, int>
     */
    private function computeDoublesDeltas(
        Collection $playing,
        array $teamMap,
        int $winningTeam,
        array $ratingsBefore,
    ): array {
        $team1 = $playing->filter(fn (GameSessionPlayer $p): bool => $teamMap[$p->id] === 1)->values();
        $team2 = $playing->filter(fn (GameSessionPlayer $p): bool => $teamMap[$p->id] === 2)->values();

        $avg = function (Collection $group) use ($ratingsBefore): float {
            $sum = 0.0;
            $n = 0;
            foreach ($group as $p) {
                if ($p->user_id === null) {
                    $sum += 1000.0;
                } else {
                    $sum += (float) ($ratingsBefore[(int) $p->user_id] ?? 1000);
                }
                $n++;
            }

            return $n > 0 ? $sum / $n : 1000.0;
        };

        $rOpp1 = $avg($team2);
        $rOpp2 = $avg($team1);

        $out = [];
        foreach ($team1 as $p) {
            if ($p->user_id === null) {
                continue;
            }
            $uid = (int) $p->user_id;
            $rSelf = (float) ($ratingsBefore[$uid] ?? 1000);
            $won = $winningTeam === 1;
            $out[$uid] = $this->elo->delta($rSelf, $rOpp1, $won ? 1.0 : 0.0);
        }
        foreach ($team2 as $p) {
            if ($p->user_id === null) {
                continue;
            }
            $uid = (int) $p->user_id;
            $rSelf = (float) ($ratingsBefore[$uid] ?? 1000);
            $won = $winningTeam === 2;
            $out[$uid] = $this->elo->delta($rSelf, $rOpp2, $won ? 1.0 : 0.0);
        }

        return $out;
    }

    private function recompactQueuePositions(int $sessionId): void
    {
        $rows = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('is_waiting', true)
            ->where('is_playing', false)
            ->orderBy('queue_position')
            ->get();

        $pos = 1;
        foreach ($rows as $row) {
            GameSessionPlayer::query()->whereKey($row->id)->update([
                'queue_position' => $pos++,
            ]);
        }
    }

    /**
     * Session ends after the final scored match; clear court and queue flags for all roster rows.
     */
    private function releasePlayersAfterSessionEnded(int $sessionId): void
    {
        GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->update([
                'is_playing' => false,
                'is_waiting' => false,
            ]);
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $players
     * @param  array<int, int>  $teamMap
     * @return array<int, array<string, mixed>>
     */
    private function buildLineupSnapshot(Collection $players, array $teamMap): array
    {
        return $players
            ->map(function (GameSessionPlayer $p) use ($teamMap): array {
                return [
                    'game_session_player_id' => (int) $p->id,
                    'user_id' => $p->user_id !== null ? (int) $p->user_id : null,
                    'guest_name' => $p->guest_name,
                    'name' => $p->displayName(),
                    'team' => isset($teamMap[$p->id]) ? (int) $teamMap[$p->id] : null,
                ];
            })
            ->values()
            ->all();
    }
}
