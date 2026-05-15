<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Support\Facades\DB;

class DeleteQueueingSessionMatch
{
    public function execute(GameSession $session, QueueingSessionMatch $match): void
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $match->game_session_id !== (int) $session->id) {
            abort(422, 'Match does not belong to this session.');
        }

        DB::transaction(function () use ($session, $match): void {
            /** @var QueueingSessionMatch|null $lockedMatch */
            $lockedMatch = QueueingSessionMatch::query()
                ->where('game_session_id', $session->id)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedMatch) {
                abort(404, 'Match not found.');
            }

            if ($lockedMatch->status !== 'queueing') {
                abort(422, 'Only queued matches can be deleted.');
            }

            $lockedMatch->delete();
        });
    }
}
