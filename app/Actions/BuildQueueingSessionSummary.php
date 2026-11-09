<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\RatingHistory;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftStore;

class BuildQueueingSessionSummary
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function execute(GameSession $session): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'Summary is only available for queueing sessions.');
        }

        if ($session->isDraft() && $session->is_active) {
            return $this->summaryFromDraft($session);
        }

        $players = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->with('user:id,name,email')
            ->orderByDesc('session_points')
            ->orderByDesc('wins_count')
            // Check-in time (created_at); earlier arrival ranks higher. Nulls last, then id.
            ->orderByRaw('created_at is null')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return $this->buildSummary($session, $players);
    }

    /**
     * @return array<string, mixed>
     */
    private function summaryFromDraft(GameSession $session): array
    {
        $hydrated = $this->hydrator->hydrate($session);
        $players = $hydrated->players
            ->sort(fn (GameSessionPlayer $a, GameSessionPlayer $b): int => $this->compareLeaderboardPlayers($a, $b))
            ->values();

        return $this->buildSummary($hydrated, $players, eloDeltaSum: 0);
    }

    /**
     * Rank: session points ↓, wins ↓, earlier check-in ↑, id ↑.
     */
    private function compareLeaderboardPlayers(GameSessionPlayer $a, GameSessionPlayer $b): int
    {
        $pointsCmp = ((int) $b->session_points) <=> ((int) $a->session_points);
        if ($pointsCmp !== 0) {
            return $pointsCmp;
        }

        $winsCmp = ((int) $b->wins_count) <=> ((int) $a->wins_count);
        if ($winsCmp !== 0) {
            return $winsCmp;
        }

        $aCheckIn = $a->created_at?->getTimestamp() ?? PHP_INT_MAX;
        $bCheckIn = $b->created_at?->getTimestamp() ?? PHP_INT_MAX;
        if ($aCheckIn !== $bCheckIn) {
            return $aCheckIn <=> $bCheckIn;
        }

        return ((int) $a->id) <=> ((int) $b->id);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, GameSessionPlayer>  $players
     * @return array<string, mixed>
     */
    private function buildSummary(GameSession $session, $players, ?int $eloDeltaSum = null): array
    {
        $totalWins = (int) $players->sum('wins_count');
        $totalLosses = (int) $players->sum('losses_count');
        $pointsAwardedSum = (int) $players->sum('session_points');

        if ($eloDeltaSum === null) {
            $eloDeltaSum = (int) RatingHistory::query()
                ->where('game_session_id', $session->id)
                ->sum('rating_change');
        }

        $ranked = $players->values()->map(function (GameSessionPlayer $p, int $idx): array {
            $isGuest = $p->isGuest();

            return [
                'rank' => $idx + 1,
                'name' => $p->displayName(),
                'wins' => (int) $p->wins_count,
                'losses' => (int) $p->losses_count,
                'total_matches' => (int) $p->wins_count + (int) $p->losses_count,
                'earned_points' => (int) $p->session_points,
                'is_guest' => $isGuest,
                'skill_level' => $p->skill_level !== null ? (int) $p->skill_level : null,
            ];
        });

        return [
            'session_id' => $session->id,
            'totals' => [
                'matches' => (int) ($session->completed_matches_count ?? 0),
                'players' => $players->count(),
                'points_awarded' => $pointsAwardedSum,
                'elo_rating_change_sum' => $eloDeltaSum,
                'wins_recorded' => $totalWins,
                'losses_recorded' => $totalLosses,
            ],
            'players' => $ranked->all(),
        ];
    }
}
