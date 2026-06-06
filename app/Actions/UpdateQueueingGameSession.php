<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateQueueingGameSession
{
    public function execute(
        User $host,
        GameSession $session,
        string $queueName,
        int $winPoints,
        int $lossPoints,
        bool $skipScores,
    ): GameSession {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if (! $session->userCanManage($host)) {
            abort(403, 'Only the queue master or an admin can update this session.');
        }

        if (! $session->is_active && ! $host->isAdmin()) {
            abort(422, 'This session is no longer active.');
        }

        return DB::transaction(function () use ($session, $queueName, $winPoints, $lossPoints, $skipScores): GameSession {
            $session->update([
                'queue_name' => $queueName,
                'win_points' => $winPoints,
                'loss_points' => $lossPoints,
                'skip_scores' => $skipScores,
            ]);

            return $session->fresh();
        });
    }
}
