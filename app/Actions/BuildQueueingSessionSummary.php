<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\RatingHistory;

class BuildQueueingSessionSummary
{
    /**
     * @return array<string, mixed>
     */
    public function execute(GameSession $session): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'Summary is only available for queueing sessions.');
        }

        $players = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->with('user:id,name,email')
            ->orderByDesc('session_points')
            ->orderByDesc('wins_count')
            ->orderBy('id')
            ->get();

        $totalWins = (int) $players->sum('wins_count');
        $totalLosses = (int) $players->sum('losses_count');
        $memberPointsSum = (int) $players->filter(fn (GameSessionPlayer $p): bool => ! $p->isGuest())->sum('session_points');

        $eloDeltaSum = (int) RatingHistory::query()
            ->where('game_session_id', $session->id)
            ->sum('rating_change');

        $ranked = $players->values()->map(function (GameSessionPlayer $p, int $idx): array {
            $isGuest = $p->isGuest();

            return [
                'rank' => $idx + 1,
                'name' => $p->displayName(),
                'wins' => (int) $p->wins_count,
                'losses' => (int) $p->losses_count,
                'total_matches' => (int) $p->wins_count + (int) $p->losses_count,
                'earned_points' => $isGuest ? null : (int) $p->session_points,
                'is_guest' => $isGuest,
            ];
        });

        return [
            'session_id' => $session->id,
            'totals' => [
                'matches' => (int) ($session->completed_matches_count ?? 0),
                'players' => $players->count(),
                'points_awarded_members' => $memberPointsSum,
                'elo_rating_change_sum' => $eloDeltaSum,
                'wins_recorded' => $totalWins,
                'losses_recorded' => $totalLosses,
            ],
            'players' => $ranked->all(),
        ];
    }
}
