<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\User;

class ClaimQueueingSessionDevice
{
    public function execute(GameSession $session, User $actor, string $deviceId): GameSession
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if ((int) $session->created_by !== (int) $actor->id && ! $actor->isAdmin()) {
            abort(403, 'Only the queue master can claim this session for offline use.');
        }

        $deviceId = trim($deviceId);
        if ($deviceId === '' || strlen($deviceId) > 64) {
            abort(422, 'Invalid device id.');
        }

        $session->update([
            'offline_device_id' => $deviceId,
            'offline_claimed_at' => now(),
        ]);

        return $session->fresh();
    }
}
