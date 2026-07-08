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
        $players = $hydrated->players->sortBy([
            ['session_points', 'desc'],
            ['wins_count', 'desc'],
            ['id', 'asc'],
        ])->values();

        return $this->buildSummary($hydrated, $players, eloDeltaSum: 0);
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
