<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
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
        $lineup = is_array($match->lineup) ? $match->lineup : [];
        $playerIds = collect($lineup)
            ->pluck('game_session_player_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values()
            ->all();

        if ($playerIds !== []) {
            GameSessionPlayer::query()
                ->where('game_session_id', $session->id)
                ->whereIn('id', $playerIds)
                ->update([
                    'is_playing' => false,
                    'is_waiting' => true,
                    'team' => null,
                ]);
        }

        $rows = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->where('is_waiting', true)
            ->where('is_playing', false)
            ->orderBy('queue_position')
            ->get();

        $pos = 1;
        foreach ($rows as $row) {
            GameSessionPlayer::query()->whereKey($row->id)->update([
                'queue_position' => $pos++,
            ]);
        }

        $match->delete();

        GameSession::query()->whereKey($session->id)->update([
            'status' => 'queueing',
        ]);
    }
}
