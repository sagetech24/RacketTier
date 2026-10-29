<?php

namespace App\Services;

/**
 * After draft persist, match lineups get new game_session_player_ids but
 * result_breakdown rows often still carry draft ids. Remap by user_id /
 * guest_name so rebuilds can credit the live roster again.
 */
class RemapFinishedMatchBreakdown
{
    /**
     * @param  list<array<string, mixed>>  $lineup
     * @param  array<string, mixed>|null  $breakdown
     * @return array<string, mixed>|null
     */
    public function remap(?array $breakdown, array $lineup): ?array
    {
        if ($breakdown === null) {
            return null;
        }

        $players = is_array($breakdown['players'] ?? null) ? $breakdown['players'] : [];
        if ($players === []) {
            return $breakdown;
        }

        $byUserId = [];
        $byGuest = [];
        foreach ($lineup as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $pid = (int) ($entry['game_session_player_id'] ?? 0);
            if ($pid <= 0) {
                continue;
            }
            $uid = $entry['user_id'] ?? null;
            if ($uid !== null) {
                $byUserId[(int) $uid] = $pid;
                continue;
            }
            $guest = strtolower(trim((string) ($entry['guest_name'] ?? '')));
            if ($guest !== '') {
                $byGuest[$guest] = $pid;
            }
        }

        $lineupIds = collect($lineup)
            ->map(fn ($row): int => (int) (is_array($row) ? ($row['game_session_player_id'] ?? 0) : 0))
            ->filter(fn (int $id): bool => $id > 0)
            ->values()
            ->all();

        $remapped = [];
        foreach ($players as $row) {
            if (! is_array($row)) {
                continue;
            }

            $oldPid = (int) ($row['game_session_player_id'] ?? 0);
            $newPid = $oldPid;

            // Already a live lineup id — keep it.
            if ($oldPid > 0 && in_array($oldPid, $lineupIds, true)) {
                $remapped[] = $row;
                continue;
            }

            $uid = $row['user_id'] ?? null;
            if ($uid !== null && isset($byUserId[(int) $uid])) {
                $newPid = $byUserId[(int) $uid];
            } else {
                $guest = strtolower(trim((string) ($row['guest_name'] ?? '')));
                if ($guest !== '' && isset($byGuest[$guest])) {
                    $newPid = $byGuest[$guest];
                }
            }

            $row['game_session_player_id'] = $newPid;
            $remapped[] = $row;
        }

        $breakdown['players'] = $remapped;

        return $breakdown;
    }

    /**
     * @param  array<int, int>  $playerIdMap  draft id => persisted id
     * @param  array<string, mixed>|null  $breakdown
     * @return array<string, mixed>|null
     */
    public function remapWithIdMap(?array $breakdown, array $playerIdMap): ?array
    {
        if ($breakdown === null) {
            return null;
        }

        $players = is_array($breakdown['players'] ?? null) ? $breakdown['players'] : [];
        if ($players === []) {
            return $breakdown;
        }

        $breakdown['players'] = array_map(function ($row) use ($playerIdMap) {
            if (! is_array($row)) {
                return $row;
            }
            $oldPid = (int) ($row['game_session_player_id'] ?? 0);
            if ($oldPid > 0 && isset($playerIdMap[$oldPid])) {
                $row['game_session_player_id'] = $playerIdMap[$oldPid];
            }

            return $row;
        }, $players);

        return $breakdown;
    }
}
