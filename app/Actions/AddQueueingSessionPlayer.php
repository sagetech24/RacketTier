<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AddQueueingSessionPlayer
{
    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null}
     */
    public function executeMember(GameSession $session, int $userId): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        return DB::transaction(function () use ($session, $userId): array {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active || $locked->status === 'ongoing') {
                abort(422, 'Cannot modify the roster while a match is in progress or the session is closed.');
            }

            User::query()->whereKey($userId)->firstOrFail();

            $exists = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('user_id', $userId)
                ->exists();
            if ($exists) {
                abort(422, 'That player is already on the roster.');
            }

            $next = (int) (GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->max('queue_position') ?? 0) + 1;

            $row = GameSessionPlayer::query()->create([
                'game_session_id' => $locked->id,
                'user_id' => $userId,
                'guest_name' => null,
                'queue_position' => $next,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
            ]);

            return $this->payload($row);
        });
    }

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null}
     */
    public function executeGuest(GameSession $session, string $guestName): array
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $guestName = trim($guestName);
        if ($guestName === '') {
            abort(422, 'Guest name is required.');
        }

        return DB::transaction(function () use ($session, $guestName): array {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active || $locked->status === 'ongoing') {
                abort(422, 'Cannot modify the roster while a match is in progress or the session is closed.');
            }

            $dup = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->whereNull('user_id')
                ->whereRaw('LOWER(guest_name) = ?', [Str::lower($guestName)])
                ->exists();
            if ($dup) {
                abort(422, 'A guest with that name is already on the roster.');
            }

            $next = (int) (GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->max('queue_position') ?? 0) + 1;

            $row = GameSessionPlayer::query()->create([
                'game_session_id' => $locked->id,
                'user_id' => null,
                'guest_name' => $guestName,
                'queue_position' => $next,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
            ]);

            return $this->payload($row);
        });
    }

    /**
     * @return array{id: int, queue_position: int, is_waiting: bool, is_playing: bool, team: int|null, user_id: int|null, guest_name: string|null}
     */
    private function payload(GameSessionPlayer $row): array
    {
        return [
            'id' => $row->id,
            'queue_position' => $row->queue_position,
            'is_waiting' => (bool) $row->is_waiting,
            'is_playing' => (bool) $row->is_playing,
            'team' => $row->team,
            'user_id' => $row->user_id !== null ? (int) $row->user_id : null,
            'guest_name' => $row->guest_name,
        ];
    }
}
