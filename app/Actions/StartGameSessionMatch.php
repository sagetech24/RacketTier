<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Support\Facades\DB;

class StartGameSessionMatch
{
    /**
     * Picks the first N waiting players (FIFO), marks them as playing, and compacts
     * remaining waiting players' queue positions to 1..k.
     */
    public function execute(GameSession $session): GameSession
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $required): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            $players = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->orderBy('queue_position')
                ->lockForUpdate()
                ->get();

            if ($players->contains(fn (GameSessionPlayer $p): bool => $p->is_playing)) {
                abort(422, 'A match is already in progress for this session.');
            }

            $eligible = $players
                ->filter(fn (GameSessionPlayer $p): bool => $p->is_waiting && ! $p->is_playing)
                ->values();

            if ($eligible->count() < $required) {
                abort(
                    422,
                    "Need at least {$required} waiting player".($required > 1 ? 's' : '').' to start.'
                );
            }

            $picked = $eligible->take($required);
            $slot = 1000;
            foreach ($picked as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'is_playing' => true,
                    'is_waiting' => false,
                    'queue_position' => $slot++,
                ]);
            }

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
