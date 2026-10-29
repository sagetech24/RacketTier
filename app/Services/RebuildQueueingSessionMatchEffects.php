<?php

namespace App\Services;

use App\Actions\GetSportRankings;
use App\Data\QueueingSessionDraft;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\PointWalletTransaction;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * After a finished-match correction, rebuild session W–L / points and (when
 * globals already applied) unwind + chronologically replay this session's
 * ELO histories and wallet credits.
 */
class RebuildQueueingSessionMatchEffects
{
    public function __construct(
        private MatchResultProcessor $matchResultProcessor,
        private QueueingSessionDraftLineup $draftLineup,
    ) {}

    public function rebuildDraft(GameSession $session, QueueingSessionDraft $draft): void
    {
        $this->resetDraftPlayerStats($draft);
        $this->applyFinishedBreakdownsToDraft($draft);
        $this->syncDraftLastResultMeta($draft);
    }

    /**
     * Rebuild DB roster stats and, when this session already wrote globals,
     * unwind then replay all finished matches in match_no order.
     *
     * Must run inside an outer DB transaction with the session locked.
     */
    public function rebuildPersisted(GameSession $session): void
    {
        $finished = QueueingSessionMatch::query()
            ->where('game_session_id', $session->id)
            ->where('status', 'finished')
            ->orderBy('match_no')
            ->get();

        $this->rebuildPersistedPlayerStats($session, $finished);

        if ($finished->isEmpty()) {
            return;
        }

        $this->unwindSessionGlobals($session);
        $this->replayPersistedFinishedMatches($session, $finished);
    }

    /**
     * Recompute result_breakdown for a finished match row without writing globals.
     *
     * @param  array<string, mixed>  $matchRow  draft or array-shaped match
     * @return array<string, mixed>
     */
    public function recomputeBreakdown(GameSession $session, array $matchRow): array
    {
        $required = $session->match_type === 'doubles' ? 4 : 2;
        $picked = $this->draftLineup->playersFromFinishedSnapshot($session, $matchRow, $required);
        $playing = $this->toPlayerModels($picked);
        $teamMap = $playing->mapWithKeys(
            fn (GameSessionPlayer $p): array => [(int) $p->id => (int) $p->team],
        )->all();

        $winningTeam = (int) ($matchRow['winning_team'] ?? 0);
        if (! in_array($winningTeam, [1, 2], true)) {
            abort(422, 'Finished match is missing a winning team.');
        }

        $team1Score = $matchRow['team1_score'] ?? null;
        $team2Score = $matchRow['team2_score'] ?? null;
        $margin = ($team1Score !== null && $team2Score !== null)
            ? abs((int) $team1Score - (int) $team2Score)
            : 0;

        return $this->matchResultProcessor->processMatch(
            $session,
            $playing,
            $teamMap,
            $winningTeam,
            $margin,
            $team1Score !== null ? (int) $team1Score : null,
            $team2Score !== null ? (int) $team2Score : null,
            persistGlobalEffects: false,
            persistSessionPlayerStats: false,
        );
    }

    private function resetDraftPlayerStats(QueueingSessionDraft $draft): void
    {
        foreach ($draft->players as $i => $player) {
            $draft->players[$i]['wins_count'] = 0;
            $draft->players[$i]['losses_count'] = 0;
            $draft->players[$i]['session_points'] = 0;
            $draft->players[$i]['last_match_result'] = null;
            $draft->players[$i]['last_match_id'] = null;
        }
    }

    private function applyFinishedBreakdownsToDraft(QueueingSessionDraft $draft): void
    {
        $finished = collect($draft->matches)
            ->filter(fn (array $m): bool => ($m['status'] ?? '') === 'finished')
            ->sortBy('match_no')
            ->values();

        foreach ($finished as $match) {
            $breakdownPlayers = is_array($match['result_breakdown']['players'] ?? null)
                ? $match['result_breakdown']['players']
                : [];
            $matchId = isset($match['id']) ? (int) $match['id'] : null;
            $byPlayerId = collect($breakdownPlayers)
                ->filter(fn ($row): bool => is_array($row))
                ->keyBy(fn (array $row): int => (int) ($row['game_session_player_id'] ?? 0));

            foreach ($draft->players as $i => $player) {
                $pid = (int) ($player['id'] ?? 0);
                $row = $byPlayerId->get($pid);
                if ($row === null) {
                    continue;
                }
                if ($row['won'] ?? false) {
                    $draft->players[$i]['wins_count'] = (int) ($draft->players[$i]['wins_count'] ?? 0) + 1;
                    $draft->players[$i]['last_match_result'] = 'win';
                } else {
                    $draft->players[$i]['losses_count'] = (int) ($draft->players[$i]['losses_count'] ?? 0) + 1;
                    $draft->players[$i]['last_match_result'] = 'loss';
                }
                if ($matchId !== null) {
                    $draft->players[$i]['last_match_id'] = $matchId;
                }
                $draft->players[$i]['session_points'] = (int) ($draft->players[$i]['session_points'] ?? 0)
                    + (int) ($row['session_points_earned'] ?? 0);
            }
        }
    }

    private function syncDraftLastResultMeta(QueueingSessionDraft $draft): void
    {
        $latest = collect($draft->matches)
            ->filter(fn (array $m): bool => ($m['status'] ?? '') === 'finished')
            ->sortByDesc(fn (array $m): int => (int) ($m['match_no'] ?? 0))
            ->first();

        if ($latest === null) {
            $draft->sessionMeta['last_team1_score'] = null;
            $draft->sessionMeta['last_team2_score'] = null;
            $draft->sessionMeta['last_winning_team'] = null;
            $draft->sessionMeta['last_finished_at'] = null;
            $draft->sessionMeta['last_result_breakdown'] = null;

            return;
        }

        $draft->sessionMeta['last_team1_score'] = $latest['team1_score'] ?? null;
        $draft->sessionMeta['last_team2_score'] = $latest['team2_score'] ?? null;
        $draft->sessionMeta['last_winning_team'] = $latest['winning_team'] ?? null;
        $draft->sessionMeta['last_finished_at'] = $latest['finished_at'] ?? null;
        $draft->sessionMeta['last_result_breakdown'] = is_array($latest['result_breakdown'] ?? null)
            ? $latest['result_breakdown']
            : null;
    }

    /**
     * @param  Collection<int, QueueingSessionMatch>  $finished
     */
    private function rebuildPersistedPlayerStats(GameSession $session, Collection $finished): void
    {
        GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->update([
                'wins_count' => 0,
                'losses_count' => 0,
                'session_points' => 0,
                'last_match_result' => null,
                'last_match_id' => null,
            ]);

        /** @var array<int, array{wins: int, losses: int, points: int, last_result: ?string, last_match_id: ?int}> $accum */
        $accum = [];

        foreach ($finished as $match) {
            $breakdownPlayers = is_array($match->result_breakdown['players'] ?? null)
                ? $match->result_breakdown['players']
                : [];

            foreach ($breakdownPlayers as $bp) {
                if (! is_array($bp)) {
                    continue;
                }
                $pid = (int) ($bp['game_session_player_id'] ?? 0);
                if ($pid <= 0) {
                    continue;
                }
                if (! isset($accum[$pid])) {
                    $accum[$pid] = [
                        'wins' => 0,
                        'losses' => 0,
                        'points' => 0,
                        'last_result' => null,
                        'last_match_id' => null,
                    ];
                }
                $won = (bool) ($bp['won'] ?? false);
                if ($won) {
                    $accum[$pid]['wins']++;
                    $accum[$pid]['last_result'] = 'win';
                } else {
                    $accum[$pid]['losses']++;
                    $accum[$pid]['last_result'] = 'loss';
                }
                $accum[$pid]['points'] += (int) ($bp['session_points_earned'] ?? 0);
                $accum[$pid]['last_match_id'] = (int) $match->id;
            }
        }

        foreach ($accum as $pid => $stats) {
            GameSessionPlayer::query()
                ->where('game_session_id', $session->id)
                ->whereKey($pid)
                ->update([
                    'wins_count' => $stats['wins'],
                    'losses_count' => $stats['losses'],
                    'session_points' => $stats['points'],
                    'last_match_result' => $stats['last_result'],
                    'last_match_id' => $stats['last_match_id'],
                ]);
        }

        $latest = $finished->last();
        if ($latest) {
            $session->forceFill([
                'last_team1_score' => $latest->team1_score,
                'last_team2_score' => $latest->team2_score,
                'last_winning_team' => $latest->winning_team,
                'last_finished_at' => $latest->finished_at,
                'last_result_breakdown' => $latest->result_breakdown,
            ])->save();
        }
    }

    private function unwindSessionGlobals(GameSession $session): void
    {
        $sportId = (int) $session->sport_id;
        $sessionId = (int) $session->id;

        $histories = RatingHistory::query()
            ->where('game_session_id', $sessionId)
            ->lockForUpdate()
            ->get();

        $netByUser = [];
        foreach ($histories as $history) {
            $uid = (int) $history->user_id;
            $netByUser[$uid] = ($netByUser[$uid] ?? 0) + (int) $history->rating_change;
        }

        foreach ($netByUser as $uid => $netChange) {
            /** @var Ranking|null $ranking */
            $ranking = Ranking::query()
                ->where('user_id', $uid)
                ->where('sport_id', $sportId)
                ->lockForUpdate()
                ->first();

            if ($ranking) {
                $ranking->update([
                    'rating' => (int) $ranking->rating - $netChange,
                ]);
            }
        }

        RatingHistory::query()->where('game_session_id', $sessionId)->delete();

        $walletTxs = PointWalletTransaction::query()
            ->where('game_session_id', $sessionId)
            ->lockForUpdate()
            ->get();

        /** @var array<int, int> $netByWallet */
        $netByWallet = [];
        foreach ($walletTxs as $tx) {
            $walletId = (int) $tx->member_point_wallet_id;
            $netByWallet[$walletId] = ($netByWallet[$walletId] ?? 0) + (int) $tx->amount;
        }

        foreach ($netByWallet as $walletId => $netAmount) {
            /** @var MemberPointWallet|null $wallet */
            $wallet = MemberPointWallet::query()
                ->whereKey($walletId)
                ->lockForUpdate()
                ->first();
            if (! $wallet) {
                continue;
            }
            $wallet->update([
                'balance' => (int) $wallet->balance - $netAmount,
            ]);
        }

        PointWalletTransaction::query()->where('game_session_id', $sessionId)->delete();

        if ($histories->isNotEmpty() || $walletTxs->isNotEmpty()) {
            GetSportRankings::bumpSportVersion($sportId);
        }
    }

    /**
     * @param  Collection<int, QueueingSessionMatch>  $finished
     */
    private function replayPersistedFinishedMatches(GameSession $session, Collection $finished): void
    {
        if ($finished->isEmpty()) {
            return;
        }

        $sportId = (int) $session->sport_id;
        $required = $session->match_type === 'doubles' ? 4 : 2;

        $replayable = $finished
            ->map(function (QueueingSessionMatch $match) use ($session, $required): array {
                $row = [
                    'id' => $match->id,
                    'match_no' => $match->match_no,
                    'status' => $match->status,
                    'lineup' => is_array($match->lineup) ? $match->lineup : [],
                    'team1_score' => $match->team1_score,
                    'team2_score' => $match->team2_score,
                    'winning_team' => $match->winning_team,
                    'result_breakdown' => $match->result_breakdown,
                ];

                return [
                    'row' => $row,
                    'players' => $this->draftLineup->playersFromFinishedSnapshot($session, $row, $required),
                ];
            })
            ->values();

        $memberUserIds = $replayable
            ->flatMap(fn (array $entry): array => $entry['players'])
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $ratingsBefore = Ranking::query()
            ->where('sport_id', $sportId)
            ->whereIn('user_id', $memberUserIds)
            ->lockForUpdate()
            ->get()
            ->mapWithKeys(fn (Ranking $r): array => [(int) $r->user_id => (int) $r->rating])
            ->all();

        foreach ($replayable as $entry) {
            $matchRow = $entry['row'];
            $playing = $this->toPlayerModels($entry['players']);
            $teamMap = $playing->mapWithKeys(
                fn (GameSessionPlayer $p): array => [(int) $p->id => (int) $p->team],
            )->all();

            $winningTeam = (int) ($matchRow['winning_team'] ?? 0);
            $team1Score = $matchRow['team1_score'] ?? null;
            $team2Score = $matchRow['team2_score'] ?? null;
            $margin = ($team1Score !== null && $team2Score !== null)
                ? abs((int) $team1Score - (int) $team2Score)
                : 0;

            $this->matchResultProcessor->processMatch(
                $session,
                $playing,
                $teamMap,
                $winningTeam,
                $margin,
                $team1Score !== null ? (int) $team1Score : null,
                $team2Score !== null ? (int) $team2Score : null,
                persistGlobalEffects: true,
                ratingsBefore: $ratingsBefore,
                persistSessionPlayerStats: false,
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $pickedArrays
     * @return Collection<int, GameSessionPlayer>
     */
    private function toPlayerModels(array $pickedArrays): Collection
    {
        $memberIds = collect($pickedArrays)
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $memberNames = $memberIds === []
            ? collect()
            : User::query()->whereIn('id', $memberIds)->pluck('name', 'id');

        return collect($pickedArrays)->map(function (array $row) use ($memberNames): GameSessionPlayer {
            $player = new GameSessionPlayer;
            $player->id = (int) $row['id'];
            $player->user_id = $row['user_id'] !== null ? (int) $row['user_id'] : null;
            $player->guest_name = $row['guest_name'] ?? null;
            $player->team = $row['team'] ?? null;

            if ($player->user_id !== null) {
                $user = new User;
                $user->id = $player->user_id;
                $user->name = (string) ($memberNames[$player->user_id] ?? ($row['name'] ?? 'Player'));
                $player->setRelation('user', $user);
            }

            return $player;
        });
    }
}
