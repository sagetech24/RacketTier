<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionMatchLineup;
use App\Services\QueueingSessionState;
use Illuminate\Support\Facades\DB;

class UpdateQueueingSessionMatch
{
    public function __construct(
        private QueueingSessionMatchLineup $lineup,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftHydrator $hydrator,
        private QueueingSessionDraftState $draftState,
        private QueueingSessionState $queueingSessionState,
    ) {}

    /**
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     */
    public function execute(GameSession $session, QueueingSessionMatch $match, array $manualLineup): QueueingSessionMatch
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

        $required = $session->match_type === 'doubles' ? 4 : 2;

        if ($session->isDraft()) {
            $hydrated = $this->draftStore->mutate($session, function ($draft) use ($session, $match, $manualLineup, $required) {
                $matchRow = $draft->findMatch((int) $match->id);
                $status = $matchRow['status'] ?? '';
                if ($matchRow === null || ! in_array($status, ['queueing', 'ongoing'], true)) {
                    abort(422, 'Only queued or ongoing matches can be edited.');
                }

                $currentIds = $status === 'ongoing'
                    ? $this->draftLineup->playerIdsFromLineup(
                        is_array($matchRow['lineup'] ?? null) ? $matchRow['lineup'] : [],
                    )
                    : [];

                $picked = $this->draftLineup->resolveManualLineup(
                    $session,
                    $draft,
                    $manualLineup,
                    $required,
                    (int) $match->id,
                    $currentIds,
                );

                foreach ($draft->matches as $i => $row) {
                    if ((int) ($row['id'] ?? 0) === (int) $match->id) {
                        $draft->matches[$i]['lineup'] = $this->draftLineup->buildSnapshot($picked);
                        break;
                    }
                }

                if ($status === 'ongoing') {
                    $this->draftState->applyOngoingMatchLineup($draft, $currentIds, $picked);
                }

                return $draft;
            });

            return $this->hydrator->hydrateMatch($hydrated, (int) $match->id);
        }

        return DB::transaction(function () use ($session, $match, $manualLineup, $required): QueueingSessionMatch {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var QueueingSessionMatch|null $lockedMatch */
            $lockedMatch = QueueingSessionMatch::query()
                ->where('game_session_id', $locked->id)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedMatch) {
                abort(404, 'Match not found.');
            }

            if (! in_array($lockedMatch->status, ['queueing', 'ongoing'], true)) {
                abort(422, 'Only queued or ongoing matches can be edited.');
            }

            $currentIds = $lockedMatch->status === 'ongoing'
                ? $this->lineup->playerIdsFromLineup(is_array($lockedMatch->lineup) ? $lockedMatch->lineup : [])
                : [];

            $players = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->orderBy('queue_position')
                ->lockForUpdate()
                ->get();

            $picked = $this->lineup->resolveManualLineup(
                $locked,
                $players,
                $manualLineup,
                $required,
                (int) $lockedMatch->id,
                $currentIds,
            );

            $lockedMatch->update([
                'lineup' => $this->lineup->buildSnapshot($picked),
            ]);

            if ($lockedMatch->status === 'ongoing') {
                $this->queueingSessionState->applyOngoingMatchLineup((int) $locked->id, $currentIds, $picked);
            }

            return $lockedMatch->fresh();
        });
    }
}
