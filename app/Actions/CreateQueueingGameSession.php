<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\Sport;
use App\Models\User;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Support\Facades\DB;

class CreateQueueingGameSession
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
    ) {}

    /**
     * @return array{session: GameSession}
     */
    public function execute(
        User $creator,
        string $queueName,
        string $sportSlug,
        string $matchType,
        int $winPoints,
        int $lossPoints,
        bool $skipScores = false,
    ): array {
        $sport = Sport::query()->where('slug', $sportSlug)->firstOrFail();

        return DB::transaction(function () use ($creator, $sport, $queueName, $matchType, $winPoints, $lossPoints, $skipScores): array {
            $session = GameSession::query()->create([
                'facility_id' => null,
                'session_context' => 'queueing',
                'persistence_state' => 'draft',
                'draft_version' => 0,
                'draft_participant_user_ids' => [],
                'queue_name' => $queueName,
                'win_points' => $winPoints,
                'loss_points' => $lossPoints,
                'skip_scores' => $skipScores,
                'completed_matches_count' => 0,
                'sport_id' => $sport->id,
                'match_type' => $matchType,
                'created_by' => $creator->id,
                'is_active' => true,
                'status' => 'queueing',
                'game_type' => 'queueing',
                'court_preference' => null,
                'started_at' => now(),
            ]);

            $this->draftStore->initialize($session);

            $session->load(['sport', 'creator']);

            return ['session' => $session];
        });
    }
}
