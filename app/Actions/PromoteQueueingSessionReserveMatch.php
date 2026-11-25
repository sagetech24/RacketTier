<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Facades\DB;

class PromoteQueueingSessionReserveMatch
{
    public function __construct(
        private QueueingSessionMatchLineup $lineup,
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionDraftHydrator $hydrator,
    ) {}

    public function execute(GameSession $session, QueueingSessionMatch $match): QueueingSessionMatch
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
            $hydrated = $this->draftStore->mutate($session, function ($draft) use ($session, $match, $required) {
                $matchRow = $draft->findMatch((int) $match->id);
                if ($matchRow === null || ($matchRow['status'] ?? '') !== 'reserved') {
                    abort(422, 'Only reserved matches can be added to the queue.');
                }

                $this->assertDraftPlayersReady($matchRow, $required, $draft);

                foreach ($draft->matches as $i => $row) {
                    if ((int) ($row['id'] ?? 0) === (int) $match->id) {
                        $draft->matches[$i]['status'] = 'queueing';
                        break;
                    }
                }

                return $draft;
            });

            return $this->hydrator->hydrateMatch($hydrated, (int) $match->id);
        }

        $promoted = DB::transaction(function () use ($session, $match, $required): QueueingSessionMatch {
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

            if (! $lockedMatch || $lockedMatch->status !== 'reserved') {
                abort(422, 'Only reserved matches can be added to the queue.');
            }

            $this->assertPersistedPlayersReady($locked, $lockedMatch, $required);

            $lockedMatch->update(['status' => 'queueing']);

            return $lockedMatch->fresh() ?? $lockedMatch;
        });

        app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh() ?? $session);

        return $promoted;
    }

    /**
     * @param  array<string, mixed>  $matchRow
     */
    private function assertDraftPlayersReady(
        array $matchRow,
        int $required,
        \App\Data\QueueingSessionDraft $draft,
    ): void {
        $lineup = is_array($matchRow['lineup'] ?? null) ? $matchRow['lineup'] : [];
        $playerIds = $this->draftLineup->playerIdsFromLineup($lineup);

        if (count($playerIds) !== $required || count(array_unique($playerIds)) !== $required) {
            abort(422, 'The reserved match lineup is invalid.');
        }

        $otherReserved = $this->draftLineup->reservedPlayerIds($draft, (int) ($matchRow['id'] ?? 0));
        foreach ($playerIds as $pid) {
            if (in_array($pid, $otherReserved, true)) {
                abort(422, 'One or more players are already assigned to a queued or reserved match.');
            }
        }

        foreach ($playerIds as $pid) {
            $row = $draft->findPlayer($pid);
            if ($row === null || ($row['is_removed'] ?? false)) {
                abort(422, 'Some players in this match are no longer on the roster.');
            }
            if (! ($row['is_waiting'] ?? false) || ($row['is_playing'] ?? false)) {
                abort(422, 'Reserved match players are not all available yet.');
            }
        }
    }

    private function assertPersistedPlayersReady(
        GameSession $session,
        QueueingSessionMatch $match,
        int $required,
    ): void {
        $lineup = is_array($match->lineup) ? $match->lineup : [];
        $playerIds = $this->lineup->playerIdsFromLineup($lineup);

        if (count($playerIds) !== $required || count(array_unique($playerIds)) !== $required) {
            abort(422, 'The reserved match lineup is invalid.');
        }

        $otherReserved = $this->lineup->reservedPlayerIds((int) $session->id, (int) $match->id);
        foreach ($playerIds as $pid) {
            if (in_array($pid, $otherReserved, true)) {
                abort(422, 'One or more players are already assigned to a queued or reserved match.');
            }
        }

        /** @var \Illuminate\Support\Collection<int, GameSessionPlayer> $rows */
        $rows = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->whereIn('id', $playerIds)
            ->lockForUpdate()
            ->get();

        if ($rows->count() !== $required) {
            abort(422, 'Some players in this match are no longer on the roster.');
        }

        $notReady = $rows->contains(fn (GameSessionPlayer $p): bool => ! $p->is_waiting || $p->is_playing || (bool) $p->getAttribute('is_removed'));
        if ($notReady) {
            abort(422, 'Reserved match players are not all available yet.');
        }
    }
}
