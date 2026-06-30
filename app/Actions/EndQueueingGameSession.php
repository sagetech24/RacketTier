<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\User;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionState;
use Illuminate\Support\Facades\DB;

class EndQueueingGameSession
{
    public function __construct(
        private QueueingSessionState $state,
        private PersistQueueingSession $persistQueueingSession,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftState $draftState,
    ) {}

    public function execute(GameSession $session, ?User $actingUser = null): GameSession
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ($session->isDraft()) {
            return $this->endDraftSession($session, $actingUser);
        }

        return DB::transaction(function () use ($session, $actingUser): GameSession {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();

            if (! $locked->is_active) {
                abort(422, 'This session is already ended.');
            }

            $forceAsAdmin = $actingUser !== null && $actingUser->isAdmin();
            $hasOngoingMatch = $this->state->hasOngoingMatch((int) $locked->id);
            $staleOngoingStatus = $locked->status === 'ongoing' && ! $hasOngoingMatch;

            if ($hasOngoingMatch) {
                if (! $forceAsAdmin) {
                    abort(422, 'End or finish the in-progress match before closing the session.');
                }

                QueueingSessionMatch::query()
                    ->where('game_session_id', $locked->id)
                    ->whereIn('status', ['ongoing', 'queueing'])
                    ->delete();
            } elseif ($staleOngoingStatus) {
                $this->state->clearOrphanPlayingPlayers((int) $locked->id);
            }

            GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->update([
                    'is_playing' => false,
                    'is_waiting' => false,
                    'team' => null,
                ]);

            GameSession::query()->whereKey($locked->id)->update([
                'is_active' => false,
                'status' => 'finished',
                'ended_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    private function endDraftSession(GameSession $session, ?User $actingUser): GameSession
    {
        $forceAsAdmin = $actingUser !== null && $actingUser->isAdmin();
        $draft = $this->draftStore->load((int) $session->id);

        if ($draft->hasOngoingMatch()) {
            if (! $forceAsAdmin) {
                abort(422, 'End or finish the in-progress match before closing the session.');
            }

            $this->draftStore->mutate($session, function ($draft) {
                $draft->matches = array_values(array_filter(
                    $draft->matches,
                    fn (array $m): bool => ! in_array($m['status'] ?? '', ['ongoing', 'queueing'], true),
                ));
                $this->draftState->clearOrphanPlayingPlayers($draft);
                $this->draftState->syncSessionMetaStatus($draft);

                return $draft;
            });
        }

        return $this->persistQueueingSession->execute($session);
    }
}
