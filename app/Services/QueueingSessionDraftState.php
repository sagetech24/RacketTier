<?php

namespace App\Services;

use App\Data\QueueingSessionDraft;

class QueueingSessionDraftState
{
    public function recompactQueuePositions(QueueingSessionDraft $draft): void
    {
        $waiting = collect($draft->players)
            ->filter(fn (array $p): bool => ($p['is_waiting'] ?? false)
                && ! ($p['is_playing'] ?? false)
                && ! ($p['is_removed'] ?? false))
            ->sortBy('queue_position')
            ->values();

        $pos = 1;
        foreach ($waiting as $row) {
            $id = (int) $row['id'];
            foreach ($draft->players as $i => $player) {
                if ((int) ($player['id'] ?? 0) === $id) {
                    $draft->players[$i]['queue_position'] = $pos++;
                    break;
                }
            }
        }
    }

    public function clearOrphanPlayingPlayers(QueueingSessionDraft $draft): void
    {
        if ($draft->hasOngoingMatch()) {
            return;
        }

        foreach ($draft->players as $i => $player) {
            if (! ($player['is_playing'] ?? false)) {
                continue;
            }
            $draft->players[$i]['is_playing'] = false;
            $draft->players[$i]['team'] = null;
            if ($player['is_removed'] ?? false) {
                $draft->players[$i]['is_waiting'] = false;
            } else {
                $draft->players[$i]['is_waiting'] = true;
            }
        }
    }

    public function syncSessionMetaStatus(QueueingSessionDraft $draft): void
    {
        $draft->sessionMeta['status'] = $draft->hasOngoingMatch() ? 'ongoing' : 'queueing';
    }

    /**
     * @param  list<array<string, mixed>>  $picked
     */
    public function markPlayersPlaying(QueueingSessionDraft $draft, array $picked): void
    {
        $pickedIds = collect($picked)->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $slot = 1000;

        foreach ($draft->players as $i => $player) {
            $id = (int) ($player['id'] ?? 0);
            if (! in_array($id, $pickedIds, true)) {
                continue;
            }
            $pickedRow = collect($picked)->firstWhere('id', $id);
            $draft->players[$i]['is_playing'] = true;
            $draft->players[$i]['is_waiting'] = false;
            $draft->players[$i]['queue_position'] = $slot++;
            $draft->players[$i]['team'] = $pickedRow['team'] ?? null;
        }

        $this->recompactQueuePositions($draft);
    }

    public function returnPlayersToQueue(QueueingSessionDraft $draft, array $playerIds): void
    {
        foreach ($draft->players as $i => $player) {
            if (! in_array((int) ($player['id'] ?? 0), $playerIds, true)) {
                continue;
            }
            $draft->players[$i]['is_playing'] = false;
            $draft->players[$i]['team'] = null;
            if ($player['is_removed'] ?? false) {
                $draft->players[$i]['is_waiting'] = false;
            } else {
                $draft->players[$i]['is_waiting'] = true;
            }
        }

        $this->recompactQueuePositions($draft);
    }

    /**
     * Drop players with no match history; soft-remove players who already played
     * so their session stats remain available for the end-of-session leaderboard.
     */
    public function removePlayer(QueueingSessionDraft $draft, int $playerId): void
    {
        $kept = [];

        foreach ($draft->players as $player) {
            if ((int) ($player['id'] ?? 0) !== $playerId) {
                $kept[] = $player;

                continue;
            }

            $played = ((int) ($player['wins_count'] ?? 0) + (int) ($player['losses_count'] ?? 0)) > 0
                || (int) ($player['session_points'] ?? 0) > 0;

            if ($played) {
                $player['is_removed'] = true;
                $player['is_waiting'] = false;
                $player['is_playing'] = false;
                $player['team'] = null;
                $player['queue_position'] = 0;
                $kept[] = $player;
            }
        }

        $draft->players = array_values($kept);
        $this->dropQueuedMatchesContainingPlayer($draft, $playerId);
        $this->recompactQueuePositions($draft);
    }

    public function restoreRemovedPlayer(QueueingSessionDraft $draft, int $playerId, array $changes = []): void
    {
        foreach ($draft->players as $i => $player) {
            if ((int) ($player['id'] ?? 0) !== $playerId) {
                continue;
            }

            $next = (int) (collect($draft->players)
                ->filter(fn (array $p): bool => ! ($p['is_removed'] ?? false))
                ->max('queue_position') ?? 0) + 1;

            $draft->players[$i] = array_merge($player, $changes, [
                'is_removed' => false,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => null,
                'queue_position' => $next,
                'checked_in_at' => ! empty($player['checked_in_at'])
                    ? $player['checked_in_at']
                    : now()->toIso8601String(),
            ]);
            break;
        }

        $this->recompactQueuePositions($draft);
    }

    private function dropQueuedMatchesContainingPlayer(QueueingSessionDraft $draft, int $playerId): void
    {
        $draft->matches = array_values(array_filter(
            $draft->matches,
            function (array $match) use ($playerId): bool {
                if (($match['status'] ?? '') !== 'queueing') {
                    return true;
                }
                $lineup = is_array($match['lineup'] ?? null) ? $match['lineup'] : [];
                foreach ($lineup as $row) {
                    if ((int) ($row['game_session_player_id'] ?? 0) === $playerId) {
                        return false;
                    }
                }

                return true;
            },
        ));
    }

    public function updatePlayerInDraft(QueueingSessionDraft $draft, int $playerId, array $changes): void
    {
        foreach ($draft->players as $i => $player) {
            if ((int) ($player['id'] ?? 0) !== $playerId) {
                continue;
            }
            $draft->players[$i] = array_merge($player, $changes);
        }
    }

    public function updateMatchInDraft(QueueingSessionDraft $draft, int $matchId, array $changes): void
    {
        foreach ($draft->matches as $i => $match) {
            if ((int) ($match['id'] ?? 0) !== $matchId) {
                continue;
            }
            $draft->matches[$i] = array_merge($match, $changes);
        }
    }

    public function removeMatch(QueueingSessionDraft $draft, int $matchId): void
    {
        $draft->matches = array_values(array_filter(
            $draft->matches,
            fn (array $m): bool => (int) ($m['id'] ?? 0) !== $matchId,
        ));
    }
}
