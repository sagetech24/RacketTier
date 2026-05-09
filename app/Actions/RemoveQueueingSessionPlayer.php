<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Support\Facades\DB;

class RemoveQueueingSessionPlayer
{
    public function execute(GameSession $session, GameSessionPlayer $player): void
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $player->game_session_id !== (int) $session->id) {
            abort(404);
        }

        DB::transaction(function () use ($session, $player): void {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active || $locked->status === 'ongoing') {
                abort(422, 'Cannot modify the roster while a match is in progress or the session is closed.');
            }

            $p = GameSessionPlayer::query()
                ->whereKey($player->id)
                ->where('game_session_id', $locked->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($p->is_playing) {
                abort(422, 'Cannot remove a player who is currently in a match.');
            }

            $p->delete();

            $rows = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('is_waiting', true)
                ->where('is_playing', false)
                ->orderBy('queue_position')
                ->get();

            $pos = 1;
            foreach ($rows as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update(['queue_position' => $pos++]);
            }
        });
    }
}
