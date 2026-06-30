<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionState;
use Illuminate\Support\Facades\DB;

class DeleteQueueingSessionMatch
{
    public function __construct(
        private QueueingSessionState $state,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftState $draftState,
    ) {}

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

        if ($session->isDraft()) {
            $this->draftStore->mutate($session, function ($draft) use ($match) {
                $matchRow = $draft->findMatch((int) $match->id);
                if ($matchRow === null) {
                    abort(404, 'Match not found.');
                }

                if (($matchRow['status'] ?? '') === 'queueing') {
                    $this->draftState->removeMatch($draft, (int) $match->id);

                    return $draft;
                }

                if (($matchRow['status'] ?? '') === 'ongoing') {
                    $lineup = is_array($matchRow['lineup'] ?? null) ? $matchRow['lineup'] : [];
                    $playerIds = collect($lineup)
                        ->pluck('game_session_player_id')
                        ->map(fn ($id): int => (int) $id)
                        ->all();
                    $this->draftState->removeMatch($draft, (int) $match->id);
                    $this->draftState->returnPlayersToQueue($draft, $playerIds);
                    $this->draftState->clearOrphanPlayingPlayers($draft);
                    $this->draftState->syncSessionMetaStatus($draft);

                    return $draft;
                }

                abort(422, 'Finished matches cannot be removed.');
            });

            return;
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
        $match->delete();

        $this->state->clearOrphanPlayingPlayers((int) $session->id);
        $this->state->recompactQueuePositions((int) $session->id);
        $this->state->syncSessionStatus($session);
    }
}
