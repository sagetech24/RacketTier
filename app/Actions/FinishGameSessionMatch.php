<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
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

    public function execute(GameSession $session, int $team1Score, int $team2Score): GameSession
    {
        if ($team1Score === $team2Score) {
            abort(422, 'Scores cannot be tied.');
        }

        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $team1Score, $team2Score, $required): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'ongoing') {
                abort(422, 'No match is in progress for this session.');
            }

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

            return $locked->fresh();
        });
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
        $userIds = $playing->pluck('user_id')->unique()->values()->all();

        foreach ($userIds as $uid) {
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
            ->whereIn('user_id', $userIds)
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
            $uid = (int) $player->user_id;
            $playerTeam = $teamMap[$player->id];
            $won = $playerTeam === $winningTeam;
            $delta = $deltas[$uid] ?? 0;
            $before = $ratingsBefore[$uid];
            $after = $before + $delta;

            $sessionPointsEarned = $won
                ? 25 + min(10, $margin)
                : 8;

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

            $pk = $player->id;
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
        $uidA = (int) $a->user_id;
        $uidB = (int) $b->user_id;
        $rA = (float) $ratingsBefore[$uidA];
        $rB = (float) $ratingsBefore[$uidB];

        $teamA = $teamMap[$a->id];
        $scoreA = $teamA === $winningTeam ? 1.0 : 0.0;

        $dA = $this->elo->delta($rA, $rB, $scoreA);
        $dB = $this->elo->delta($rB, $rA, 1.0 - $scoreA);

        return [
            $uidA => $dA,
            $uidB => $dB,
        ];
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
            foreach ($group as $p) {
                $sum += (float) $ratingsBefore[(int) $p->user_id];
            }

            return $sum / max(1, $group->count());
        };

        $rOpp1 = $avg($team2);
        $rOpp2 = $avg($team1);

        $out = [];
        foreach ($team1 as $p) {
            $uid = (int) $p->user_id;
            $rSelf = (float) $ratingsBefore[$uid];
            $won = $winningTeam === 1;
            $out[$uid] = $this->elo->delta($rSelf, $rOpp1, $won ? 1.0 : 0.0);
        }
        foreach ($team2 as $p) {
            $uid = (int) $p->user_id;
            $rSelf = (float) $ratingsBefore[$uid];
            $won = $winningTeam === 2;
            $out[$uid] = $this->elo->delta($rSelf, $rOpp2, $won ? 1.0 : 0.0);
        }

        return $out;
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
}
