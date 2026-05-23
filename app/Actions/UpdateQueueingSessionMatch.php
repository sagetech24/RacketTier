<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Facades\DB;

class UpdateQueueingSessionMatch
{
    public function __construct(
        private QueueingSessionMatchLineup $lineup,
    ) {}

    /**
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     */
    public function execute(GameSession $session, QueueingSessionMatch $match, array $manualLineup): QueueingSessionMatch
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

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $match, $manualLineup, $required): QueueingSessionMatch {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var QueueingSessionMatch|null $lockedMatch */
            $lockedMatch = QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedMatch) {
                abort(404, 'Match not found.');
            }

            if ($lockedMatch->status !== 'queueing') {
                abort(422, 'Only queued matches can be edited.');
            }

            $players = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->orderBy('queue_position')
                ->lockForUpdate()
                ->get();

            $picked = $this->lineup->resolveManualLineup(
                $locked,
                $players,
                $manualLineup,
                $required,
                (int) $lockedMatch->id,
            );

            $lockedMatch->update([
                'lineup' => $this->lineup->buildSnapshot($picked),
            ]);

            return $lockedMatch->fresh();
        });
    }
}
