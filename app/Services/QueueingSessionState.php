<?php

namespace App\Services;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class QueueingSessionState
{
    private const RECONCILE_THROTTLE_SECONDS = 30;

    public function hasOngoingMatch(int $gameSessionId): bool
    {
        return QueueingSessionMatch::query()
            ->where('game_session_id', $gameSessionId)
            ->where('status', 'ongoing')
            ->exists();
    }

    /**
     * When no match is in progress, clear stale is_playing flags and return players to the queue.
     */
    public function clearOrphanPlayingPlayers(int $gameSessionId): void
    {
        if ($this->hasOngoingMatch($gameSessionId)) {
            return;
        }

        GameSessionPlayer::query()
            ->where('game_session_id', $gameSessionId)
            ->where('is_playing', true)
            ->update([
                'is_playing' => false,
                'is_waiting' => true,
                'team' => null,
            ]);
    }

    /**
     * Keep an ongoing match on court: mark the new lineup playing and return
     * swapped-out players to the end of the waiting queue.
     *
     * @param  list<int>  $previousPlayerIds
     * @param  Collection<int, GameSessionPlayer>  $picked
     */
    public function applyOngoingMatchLineup(int $gameSessionId, array $previousPlayerIds, Collection $picked): void
    {
        $newIds = $picked->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $outgoing = array_values(array_diff($previousPlayerIds, $newIds));

        $slot = 1000;
        foreach ($picked as $row) {
            GameSessionPlayer::query()->whereKey($row->id)->update([
                'is_playing' => true,
                'is_waiting' => false,
                'queue_position' => $slot++,
                'team' => $row->team,
            ]);
        }

        $waitSlot = 2000;
        foreach ($outgoing as $id) {
            GameSessionPlayer::query()->whereKey($id)->update([
                'is_playing' => false,
                'is_waiting' => true,
                'team' => null,
                'queue_position' => $waitSlot++,
            ]);
        }

        $this->recompactQueuePositions($gameSessionId);
    }

    public function recompactQueuePositions(int $gameSessionId): void
    {
        $ids = GameSessionPlayer::query()
            ->where('game_session_id', $gameSessionId)
            ->where('is_waiting', true)
            ->where('is_playing', false)
            ->orderBy('queue_position')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return;
        }

        $cases = [];
        $bindings = [];
        foreach ($ids->values() as $index => $id) {
            $cases[] = 'WHEN ? THEN ?';
            $bindings[] = (int) $id;
            $bindings[] = $index + 1;
        }

        $placeholders = implode(',', array_fill(0, $ids->count(), '?'));
        $caseSql = implode(' ', $cases);

        DB::update(
            "UPDATE game_session_players SET queue_position = CASE id {$caseSql} END WHERE id IN ({$placeholders})",
            [...$bindings, ...$ids->all()],
        );
    }

    /**
     * Align session status with whether an ongoing match row exists.
     */
    public function syncSessionStatus(GameSession $session): void
    {
        if (! $session->is_active || ! $session->isQueueing()) {
            return;
        }

        GameSession::query()->whereKey($session->id)->update([
            'status' => $this->hasOngoingMatch((int) $session->id) ? 'ongoing' : 'queueing',
        ]);
    }

    /**
     * Heal desynced player flags and session status for active queueing sessions.
     * Safe to call on read paths; no-ops when state is already consistent.
     */
    public function reconcileStaleActiveSession(GameSession $session): bool
    {
        if (! $session->is_active || ! $session->isQueueing()) {
            return false;
        }

        $sessionId = (int) $session->id;
        $hasOngoing = $this->hasOngoingMatch($sessionId);

        if ($hasOngoing) {
            if ($session->status !== 'ongoing') {
                GameSession::query()->whereKey($sessionId)->update(['status' => 'ongoing']);

                return true;
            }

            return false;
        }

        $hasOrphanPlaying = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('is_playing', true)
            ->exists();

        if ($session->status !== 'ongoing' && ! $hasOrphanPlaying) {
            return false;
        }

        $this->clearOrphanPlayingPlayers($sessionId);
        $this->recompactQueuePositions($sessionId);
        $this->syncSessionStatus($session);

        return true;
    }

    /**
     * Throttled reconcile for read paths (e.g. polling) to avoid write storms.
     */
    public function reconcileStaleActiveSessionIfDue(GameSession $session): bool
    {
        if (! $session->is_active || ! $session->isQueueing()) {
            return false;
        }

        $cacheKey = 'queueing_reconcile:'.$session->id;

        if (Cache::has($cacheKey)) {
            return false;
        }

        $changed = $this->reconcileStaleActiveSession($session);
        Cache::put($cacheKey, true, now()->addSeconds(self::RECONCILE_THROTTLE_SECONDS));

        return $changed;
    }
}
