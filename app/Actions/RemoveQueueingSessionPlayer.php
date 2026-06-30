<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionState;
use Illuminate\Support\Facades\DB;

class RemoveQueueingSessionPlayer
{
    public function __construct(
        private QueueingSessionState $queueingSessionState,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftState $draftState,
    ) {}

    public function execute(GameSession $session, GameSessionPlayer $player): void
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $player->game_session_id !== (int) $session->id) {
            abort(404);
        }

        if ($session->isDraft()) {
            $this->draftStore->mutate($session, function ($draft) use ($player) {
                $row = $draft->findPlayer((int) $player->id);
                if ($row === null) {
                    abort(404);
                }
                if ($row['is_playing'] ?? false) {
                    abort(422, 'Cannot remove a player who is currently in a match.');
                }
                $this->draftState->removePlayer($draft, (int) $player->id);

                return $draft;
            });

            return;
        }

        DB::transaction(function () use ($session, $player): void {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
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

            $this->queueingSessionState->recompactQueuePositions((int) $locked->id);
        });
    }
}
