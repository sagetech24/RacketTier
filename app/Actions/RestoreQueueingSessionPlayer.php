<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;

class RestoreQueueingSessionPlayer
{
    public function __construct(
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

        if (! $session->isDraft()) {
            abort(422, 'Players can only be restored while the session is in progress.');
        }

        if (! $session->is_active) {
            abort(422, 'Cannot modify the roster after the session has ended.');
        }

        if (! (bool) ($player->getAttribute('is_removed') ?? false)) {
            abort(422, 'That player is not removed from the roster.');
        }

        $this->draftStore->mutate($session, function ($draft) use ($player) {
            $row = $draft->findPlayer((int) $player->id);
            if ($row === null) {
                abort(404);
            }
            if (! ($row['is_removed'] ?? false)) {
                abort(422, 'That player is not removed from the roster.');
            }

            $this->draftState->restoreRemovedPlayer($draft, (int) $player->id);

            return $draft;
        });
    }
}
