<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Services\QueueingSessionDraftLineup;
use App\Services\QueueingSessionDraftState;
use App\Services\QueueingSessionDraftStore;
use App\Services\QueueingSessionMatchLineup;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReorderQueueingSessionCheckIn
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftState $draftState,
        private QueueingSessionDraftLineup $draftLineup,
        private QueueingSessionMatchLineup $matchLineup,
    ) {}

    /**
     * @param  list<int>  $playerIds  Ordered oldest → newest check-in (first = next lobby anchor).
     */
    public function execute(GameSession $session, array $playerIds): void
    {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        $playerIds = array_values(array_map(fn ($id): int => (int) $id, $playerIds));

        if ($session->isDraft()) {
            $this->draftStore->mutate($session, function ($draft) use ($playerIds) {
                $reserved = $this->draftLineup->reservedPlayerIds($draft);
                $checkInIds = $this->draftCheckInWaiterIds($draft->players, $reserved);
                $this->assertExactPermutation($playerIds, $checkInIds);

                $timestamps = $this->orderedTimestampsForPlayers($draft->players, $checkInIds);
                $this->draftState->reorderCheckInPlayers($draft, $playerIds, $timestamps);

                return $draft;
            });

            return;
        }

        DB::transaction(function () use ($session, $playerIds): void {
            $locked = GameSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if (! $locked->is_active) {
                abort(422, 'Cannot modify the roster after the session has ended.');
            }

            $reserved = $this->matchLineup->reservedPlayerIds((int) $locked->id);
            $waiters = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('is_waiting', true)
                ->where('is_playing', false)
                ->whereRaw('(COALESCE(wins_count, 0) + COALESCE(losses_count, 0)) = 0')
                ->when($reserved !== [], fn ($q) => $q->whereNotIn('id', $reserved))
                ->lockForUpdate()
                ->get();

            $checkInIds = $waiters->pluck('id')->map(fn ($id): int => (int) $id)->sort()->values()->all();
            $this->assertExactPermutation($playerIds, $checkInIds);

            $byId = $waiters->keyBy(fn (GameSessionPlayer $p): int => (int) $p->id);
            $timestamps = $this->orderedTimestampsFromModels($waiters);
            foreach ($playerIds as $index => $id) {
                $row = $byId->get($id);
                if ($row === null) {
                    abort(422, 'Invalid check-in player id.');
                }
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'created_at' => $timestamps[$index],
                ]);
            }
        });
    }

    /**
     * @param  list<array<string, mixed>>  $players
     * @param  list<int>  $reserved
     * @return list<int>
     */
    private function draftCheckInWaiterIds(array $players, array $reserved): array
    {
        return collect($players)
            ->filter(function (array $p) use ($reserved): bool {
                if ($p['is_removed'] ?? false) {
                    return false;
                }
                if (! ($p['is_waiting'] ?? false) || ($p['is_playing'] ?? false)) {
                    return false;
                }
                $played = ((int) ($p['wins_count'] ?? 0) + (int) ($p['losses_count'] ?? 0)) > 0;
                if ($played) {
                    return false;
                }
                $id = (int) ($p['id'] ?? 0);

                return $id > 0 && ! in_array($id, $reserved, true);
            })
            ->map(fn (array $p): int => (int) $p['id'])
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $playerIds
     * @param  list<int>  $expectedSorted
     */
    private function assertExactPermutation(array $playerIds, array $expectedSorted): void
    {
        if ($playerIds === []) {
            abort(422, 'At least one check-in player is required.');
        }

        if (count($playerIds) !== count(array_unique($playerIds))) {
            abort(422, 'Check-in order contains duplicate players.');
        }

        $sortedPayload = $playerIds;
        sort($sortedPayload);
        if ($sortedPayload !== $expectedSorted) {
            abort(422, 'Check-in order must include exactly the current check-in waiters.');
        }
    }

    /**
     * Preserve the existing timestamp set when unique; otherwise synthesize
     * spaced times so FIFO order is unambiguous (e.g. after session duplicate).
     *
     * @param  list<array<string, mixed>>  $players
     * @param  list<int>  $checkInIds
     * @return list<Carbon>
     */
    private function orderedTimestampsForPlayers(array $players, array $checkInIds): array
    {
        $byId = collect($players)->keyBy(fn (array $p): int => (int) ($p['id'] ?? 0));
        $parsed = [];
        foreach ($checkInIds as $id) {
            $row = $byId->get($id);
            $raw = is_array($row) ? ($row['checked_in_at'] ?? null) : null;
            $parsed[] = is_string($raw) && $raw !== ''
                ? Carbon::parse($raw)
                : now();
        }

        return $this->uniqueAscendingTimestamps($parsed);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, GameSessionPlayer>  $waiters
     * @return list<Carbon>
     */
    private function orderedTimestampsFromModels($waiters): array
    {
        $parsed = $waiters
            ->sortBy(fn (GameSessionPlayer $p): int => (int) $p->id)
            ->values()
            ->map(fn (GameSessionPlayer $p): Carbon => $p->created_at?->copy() ?? now())
            ->all();

        return $this->uniqueAscendingTimestamps($parsed);
    }

    /**
     * @param  list<Carbon>  $parsed
     * @return list<Carbon>
     */
    private function uniqueAscendingTimestamps(array $parsed): array
    {
        $count = count($parsed);
        if ($count === 0) {
            return [];
        }

        usort($parsed, fn (Carbon $a, Carbon $b): int => $a->getTimestamp() <=> $b->getTimestamp());

        $unique = collect($parsed)
            ->map(fn (Carbon $t): int => $t->getTimestamp())
            ->unique()
            ->count() === $count;

        if ($unique) {
            return array_values($parsed);
        }

        $base = $parsed[0]->copy();
        $out = [];
        for ($i = 0; $i < $count; $i++) {
            $out[] = $base->copy()->addSeconds($i);
        }

        return $out;
    }
}
