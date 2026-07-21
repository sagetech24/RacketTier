<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UpdateQueueingSessionPlayer
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftState $draftState,
    ) {}

    public function executeGuest(
        GameSession $session,
        GameSessionPlayer $player,
        string $guestName,
        ?string $pronoun,
        ?int $skillLevel,
    ): void {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $player->game_session_id !== (int) $session->id) {
            abort(422, 'That player is not on this roster.');
        }

        if (! $player->isGuest()) {
            abort(422, 'Guest fields only apply to guest players.');
        }

        $guestName = trim($guestName);
        if ($guestName === '') {
            abort(422, 'Guest name is required.');
        }

        $resolvedPronoun = $pronoun !== null && trim($pronoun) !== '' ? trim($pronoun) : null;

        if ($session->isDraft()) {
            $this->draftStore->mutate($session, function ($draft) use ($player, $guestName, $resolvedPronoun, $skillLevel) {
                if ($this->draftLineup->guestNameExists($draft, $guestName, (int) $player->id)) {
                    abort(422, 'A guest with that name is already on the roster.');
                }
                $this->draftState->updatePlayerInDraft($draft, (int) $player->id, [
                    'guest_name' => $guestName,
                    'pronoun' => $resolvedPronoun,
                    'skill_level' => $skillLevel,
                ]);

                return $draft;
            });

            return;
        }

        DB::transaction(function () use ($session, $player, $guestName, $resolvedPronoun, $skillLevel): void {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
            }

            $dup = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->whereNull('user_id')
                ->whereKeyNot($player->id)
                ->whereRaw('LOWER(guest_name) = ?', [Str::lower($guestName)])
                ->exists();
            if ($dup) {
                abort(422, 'A guest with that name is already on the roster.');
            }

            $player->update([
                'guest_name' => $guestName,
                'pronoun' => $resolvedPronoun,
                'skill_level' => $skillLevel,
            ]);
        });
    }

    public function executeMember(GameSession $session, GameSessionPlayer $player, int $skillLevel): void
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $player->game_session_id !== (int) $session->id) {
            abort(422, 'That player is not on this roster.');
        }

        if ($player->isGuest()) {
            abort(422, 'Member fields only apply to registered players.');
        }

        if ($session->isDraft()) {
            $this->draftStore->mutate($session, function ($draft) use ($player, $skillLevel) {
                $this->draftState->updatePlayerInDraft($draft, (int) $player->id, [
                    'skill_level' => $skillLevel,
                ]);

                return $draft;
            });

            return;
        }

        DB::transaction(function () use ($session, $player, $skillLevel): void {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
            }

            $player->update([
                'skill_level' => $skillLevel,
            ]);
        });
    }
}
