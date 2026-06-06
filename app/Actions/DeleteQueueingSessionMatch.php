<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionState;
use Illuminate\Support\Facades\DB;

class DeleteQueueingSessionMatch
{
    public function __construct(
        private QueueingSessionState $state,
    ) {}

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
            /** @var GameSession|null $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->first();

            if (! $locked) {
                abort(404, 'Session not found.');
            }

            /** @var QueueingSessionMatch|null $lockedMatch */
            $lockedMatch = QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedMatch) {
                abort(404, 'Match not found.');
            }

            if ($lockedMatch->status === 'queueing') {
                $lockedMatch->delete();

                return;
            }

            if ($lockedMatch->status === 'ongoing') {
                $this->cancelOngoingMatch($locked, $lockedMatch);

                return;
            }

            abort(422, 'Finished matches cannot be removed.');
        });
    }

    private function cancelOngoingMatch(GameSession $session, QueueingSessionMatch $match): void
    {
        $match->delete();

        $this->state->clearOrphanPlayingPlayers((int) $session->id);
        $this->state->recompactQueuePositions((int) $session->id);
        $this->state->syncSessionStatus($session);
    }
}
