<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Support\Facades\DB;

class EndQueueingGameSession
{
    public function execute(GameSession $session): GameSession
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        return DB::transaction(function () use ($session): GameSession {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

            if (! $locked->is_active) {
                abort(422, 'This session is already ended.');
            }

            if ($locked->status === 'ongoing') {
                abort(422, 'End or finish the in-progress match before closing the session.');
            }

            GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->update([
                    'is_playing' => false,
                    'is_waiting' => false,
                ]);

            GameSession::query()->whereKey($locked->id)->update([
                'is_active' => false,
                'status' => 'finished',
                'ended_at' => now(),
            ]);

            return $locked->fresh();
        });
    }
}
