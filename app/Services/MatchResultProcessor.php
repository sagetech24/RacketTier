<?php

namespace App\Services;

use App\Actions\CreditMemberPointWallet;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Ranking;
use App\Models\RatingHistory;
use Illuminate\Support\Collection;

class MatchResultProcessor
{
    public function __construct(
        private EloCalculator $elo,
        private CreditMemberPointWallet $creditMemberPointWallet,
    ) {}

    /**
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @param  array<int, int>  $teamMap
     * @param  array<int, int>|null  $ratingsBefore  user_id => rating; updated in place when persisting
     * @return array<string, mixed>
     */
    public function processMatch(
        GameSession $session,
        Collection $playing,
        array $teamMap,
        int $winningTeam,
        int $margin,
        ?int $team1Score,
        ?int $team2Score,
        bool $persistGlobalEffects = true,
        ?array &$ratingsBefore = null,
        bool $persistSessionPlayerStats = true,
    ): array {
        $sportId = (int) $session->sport_id;
        $memberUserIds = $playing->pluck('user_id')->filter()->unique()->values()->all();

        if ($ratingsBefore === null) {
            $ratingsBefore = Ranking::query()
                ->where('sport_id', $sportId)
                ->whereIn('user_id', $memberUserIds)
                ->orderBy('user_id')
                ->when($persistGlobalEffects, fn ($q) => $q->lockForUpdate())
                ->get()
                ->mapWithKeys(fn (Ranking $r): array => [(int) $r->user_id => (int) $r->rating])
                ->all();
        }

        $deltas = $session->match_type === 'doubles'
            ? $this->computeDoublesDeltas($playing, $teamMap, $winningTeam, $ratingsBefore)
            : $this->computeSinglesDeltas($playing, $teamMap, $winningTeam, $ratingsBefore);

        $rows = [];
        foreach ($playing as $player) {
            $playerTeam = $teamMap[$player->id];
            $won = $playerTeam === $winningTeam;
            $pk = $player->id;
            $isGuest = $player->isGuest();
            $sessionPointsEarned = $this->resolveSessionPointsEarned($session, $won, $margin);

            if ($isGuest) {
                if ($persistGlobalEffects && $persistSessionPlayerStats) {
                    if ($won) {
                        GameSessionPlayer::query()->whereKey($pk)->increment('wins_count');
                    } else {
                        GameSessionPlayer::query()->whereKey($pk)->increment('losses_count');
                    }
                    GameSessionPlayer::query()->whereKey($pk)->increment('session_points', $sessionPointsEarned);
                }

                $rows[] = [
                    'game_session_player_id' => $pk,
                    'user_id' => null,
                    'guest_name' => $player->guest_name,
                    'name' => $player->displayName(),
                    'team' => $playerTeam,
                    'won' => $won,
                    'rating_before' => null,
                    'rating_after' => null,
                    'rating_change' => null,
                    'session_points_earned' => $sessionPointsEarned,
                ];

                continue;
            }

            $uid = (int) $player->user_id;
            $delta = $deltas[$uid] ?? 0;
            $before = $ratingsBefore[$uid] ?? 1000;
            $after = $before + $delta;

            if ($persistGlobalEffects) {
                Ranking::query()->updateOrCreate(
                    ['user_id' => $uid, 'sport_id' => $sportId],
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

                if ($persistSessionPlayerStats) {
                    GameSessionPlayer::query()->whereKey($pk)->increment('session_points', $sessionPointsEarned);
                    if ($won) {
                        GameSessionPlayer::query()->whereKey($pk)->increment('wins_count');
                    } else {
                        GameSessionPlayer::query()->whereKey($pk)->increment('losses_count');
                    }
                }

                $this->creditMemberPointWallet->execute(
                    $uid,
                    $sportId,
                    $sessionPointsEarned,
                    (int) $session->id,
                );
            }

            $ratingsBefore[$uid] = $after;

            $rows[] = [
                'game_session_player_id' => $pk,
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

    /**
     * @param  list<array<string, mixed>>  $draftPlayers
     * @param  array<int, int>  $teamMap
     * @param  array<string, mixed>  $breakdown
     */
    public function applyBreakdownToDraftPlayers(array &$draftPlayers, array $teamMap, array $breakdown, ?int $matchId = null): void
    {
        $byPlayerId = collect($breakdown['players'] ?? [])
            ->keyBy(fn (array $row): int => (int) ($row['game_session_player_id'] ?? 0));

        foreach ($draftPlayers as $i => $player) {
            $pid = (int) ($player['id'] ?? 0);
            $row = $byPlayerId->get($pid);
            if ($row === null) {
                continue;
            }
            if ($row['won'] ?? false) {
                $draftPlayers[$i]['wins_count'] = (int) ($draftPlayers[$i]['wins_count'] ?? 0) + 1;
                $draftPlayers[$i]['last_match_result'] = 'win';
            } else {
                $draftPlayers[$i]['losses_count'] = (int) ($draftPlayers[$i]['losses_count'] ?? 0) + 1;
                $draftPlayers[$i]['last_match_result'] = 'loss';
            }
            if ($matchId !== null) {
                $draftPlayers[$i]['last_match_id'] = $matchId;
            }
            $draftPlayers[$i]['session_points'] = (int) ($draftPlayers[$i]['session_points'] ?? 0)
                + (int) ($row['session_points_earned'] ?? 0);
        }
    }

    /**
     * @param  array<string, mixed>  $breakdown
     */
    public function applyLastMatchResults(array $breakdown, ?int $matchId = null): void
    {
        foreach ($breakdown['players'] ?? [] as $row) {
            $playerId = (int) ($row['game_session_player_id'] ?? 0);
            if ($playerId <= 0) {
                continue;
            }

            GameSessionPlayer::query()->whereKey($playerId)->update([
                'last_match_result' => ($row['won'] ?? false) ? 'win' : 'loss',
                'last_match_id' => $matchId,
            ]);
        }
    }

    public function resolveSessionPointsEarned(GameSession $session, bool $won, int $margin): int
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
     * @param  Collection<int, GameSessionPlayer>  $playing
     * @param  array<int, int>  $teamMap
     * @param  array<int, int>  $ratingsBefore
     * @return array<int, int>
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
     * @param  Collection<int, GameSessionPlayer>  $teamMap
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
}
