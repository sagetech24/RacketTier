<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Facades\DB;

class StartQueueingSessionMatch
{
    public function __construct(
        private QueueingSessionMatchLineup $lineup,
    ) {}

    public function execute(GameSession $session, QueueingSessionMatch $match): GameSession
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

        return DB::transaction(function () use ($session, $match, $required): GameSession {
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

            if (! $lockedMatch || $lockedMatch->status !== 'queueing') {
                abort(422, 'This match is not in the queue.');
            }

            $picked = $this->lineup->playersFromStoredLineup($locked, $lockedMatch, $required);

            $slot = 1000;
            foreach ($picked as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'is_playing' => true,
                    'is_waiting' => false,
                    'queue_position' => $slot++,
                    'team' => $row->team,
                ]);
            }

            $lockedMatch->update([
                'status' => 'ongoing',
                'lineup' => $this->lineup->buildSnapshot($picked),
                'started_at' => now(),
            ]);

            $waitingRows = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('is_waiting', true)
                ->where('is_playing', false)
                ->orderBy('queue_position')
                ->get();

            $pos = 1;
            foreach ($waitingRows as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'queue_position' => $pos++,
                ]);
            }

            GameSession::query()->whereKey($locked->id)->update([
                'status' => 'ongoing',
            ]);

            return $locked->fresh();
        });
    }
}
