<?php

namespace App\Services;

use App\Data\QueueingSessionDraft;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Str;

class QueueingSessionDraftLineup
{
    /**
     * @return list<int>
     */
    public function reservedPlayerIds(QueueingSessionDraft $draft, ?int $excludeMatchId = null): array
    {
        $ids = [];
        foreach ($draft->matches as $match) {
            if (($match['status'] ?? '') !== 'queueing') {
                continue;
            }
            if ($excludeMatchId !== null && (int) ($match['id'] ?? 0) === $excludeMatchId) {
                continue;
            }
            $lineup = is_array($match['lineup'] ?? null) ? $match['lineup'] : [];
            foreach ($lineup as $row) {
                $pid = (int) ($row['game_session_player_id'] ?? 0);
                if ($pid > 0) {
                    $ids[] = $pid;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  list<array<string, mixed>>|null  $lineup
     * @return list<int>
     */
    public function playerIdsFromLineup(?array $lineup): array
    {
        if ($lineup === null) {
            return [];
        }

        return collect($lineup)
            ->pluck('game_session_player_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values()
            ->all();
    }

    /**
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     * @param  list<int>  $allowPlayingPlayerIds  On-court player ids already in this ongoing match.
     * @return list<array<string, mixed>>
     */
    public function resolveManualLineup(
        GameSession $session,
        QueueingSessionDraft $draft,
        array $manualLineup,
        int $required,
        ?int $excludeReservedMatchId = null,
        array $allowPlayingPlayerIds = [],
    ): array {
        if (count($manualLineup) !== $required) {
            abort(422, "Manual lineup must include exactly {$required} players.");
        }

        $ids = collect($manualLineup)->pluck('id')->map(fn ($id): int => (int) $id);
        if ($ids->unique()->count() !== $ids->count()) {
            abort(422, 'Manual lineup contains duplicate players.');
        }

        $reserved = $this->reservedPlayerIds($draft, $excludeReservedMatchId);
        $reservedHit = $ids->first(fn (int $id): bool => in_array($id, $reserved, true));
        if ($reservedHit !== null) {
            abort(422, 'One or more players are already assigned to a queued match.');
        }

        $picked = [];
        foreach ($manualLineup as $i => $spec) {
            $id = (int) ($spec['id'] ?? 0);
            $row = $draft->findPlayer($id);
            if ($row === null) {
                abort(422, 'Invalid player id in manual lineup.');
            }
            if ($row['is_removed'] ?? false) {
                abort(422, 'Removed players cannot be added to a match.');
            }
            $isCurrentOnCourt = in_array($id, $allowPlayingPlayerIds, true);
            if (! $isCurrentOnCourt && (! ($row['is_waiting'] ?? false) || ($row['is_playing'] ?? false))) {
                abort(422, ($row['is_playing'] ?? false)
                    ? 'Only waiting players can replace someone on court.'
                    : 'Manual lineup players must be waiting and not already on court.');
            }

            $team = $spec['team'] ?? null;
            if ($session->match_type === 'singles') {
                $team = $i === 0 ? 1 : 2;
            }
            if ($team !== 1 && $team !== 2) {
                abort(422, 'Each doubles player must include team 1 or 2 in the manual lineup.');
            }

            $picked[] = array_merge($row, ['team' => $team]);
        }

        if ($session->match_type === 'doubles') {
            $g = collect($picked)->groupBy(fn (array $p): int => (int) $p['team']);
            if ($g->count() !== 2 || $g->get(1)?->count() !== 2 || $g->get(2)?->count() !== 2) {
                abort(422, 'Doubles manual lineup requires two players on team 1 and two on team 2.');
            }
        }

        return $picked;
    }

    /**
     * @param  list<array<string, mixed>>  $picked
     * @return list<array<string, mixed>>
     */
    public function buildSnapshot(array $picked): array
    {
        $memberIds = collect($picked)
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->values()
            ->all();

        $memberNames = $memberIds === []
            ? collect()
            : User::query()->whereIn('id', $memberIds)->pluck('name', 'id');

        return collect($picked)
            ->map(function (array $p) use ($memberNames): array {
                $uid = $p['user_id'] ?? null;
                $name = $uid !== null
                    ? (string) ($memberNames[(int) $uid] ?? 'Player')
                    : (string) ($p['guest_name'] ?? 'Guest');

                return [
                    'game_session_player_id' => (int) $p['id'],
                    'user_id' => $uid !== null ? (int) $uid : null,
                    'guest_name' => $p['guest_name'] ?? null,
                    'name' => $name,
                    'team' => isset($p['team']) ? (int) $p['team'] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function playersFromOngoingLineup(
        GameSession $session,
        array $match,
        int $required,
        QueueingSessionDraft $draft,
    ): array {
        $lineup = is_array($match['lineup'] ?? null) ? $match['lineup'] : [];
        $playerIds = collect($lineup)
            ->pluck('game_session_player_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values();

        if ($playerIds->count() !== $required || $playerIds->unique()->count() !== $required) {
            abort(422, 'The selected match lineup is invalid.');
        }

        $lineupTeams = collect($lineup)
            ->mapWithKeys(function ($row): array {
                $pid = (int) ($row['game_session_player_id'] ?? 0);
                $team = isset($row['team']) ? (int) $row['team'] : null;
                if ($pid <= 0) {
                    return [];
                }

                return [$pid => $team];
            })
            ->all();

        $rows = $playerIds
            ->map(fn (int $id): ?array => $draft->findPlayer($id))
            ->filter()
            ->values();

        if ($rows->count() !== $required) {
            abort(422, 'Some players in this match are no longer active on court.');
        }

        $blocked = $rows->contains(fn (array $p): bool => ! ($p['is_playing'] ?? false));
        if ($blocked) {
            abort(422, 'Some players in this match are no longer active on court.');
        }

        if ($session->match_type === 'doubles') {
            $missing = $rows->contains(fn (array $p): bool => ! in_array($lineupTeams[(int) $p['id']] ?? null, [1, 2], true));
            if ($missing) {
                abort(422, 'Doubles match lineup is missing team assignments.');
            }
            $grouped = $rows->groupBy(fn (array $p): int => (int) ($lineupTeams[(int) $p['id']] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        return $rows
            ->values()
            ->map(function (array $p, int $index) use ($session, $lineupTeams): array {
                if ($session->match_type === 'singles') {
                    $team = $lineupTeams[(int) $p['id']] ?? null;
                    $p['team'] = in_array($team, [1, 2], true) ? (int) $team : ($index === 0 ? 1 : 2);
                } else {
                    $p['team'] = (int) $lineupTeams[(int) $p['id']];
                }

                return $p;
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function playersFromStoredLineup(
        GameSession $session,
        array $match,
        int $required,
        QueueingSessionDraft $draft,
    ): array {
        $lineup = is_array($match['lineup'] ?? null) ? $match['lineup'] : [];
        $playerIds = collect($lineup)
            ->pluck('game_session_player_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values();

        if ($playerIds->count() !== $required || $playerIds->unique()->count() !== $required) {
            abort(422, 'The queued match lineup is invalid.');
        }

        $lineupTeams = collect($lineup)
            ->mapWithKeys(function ($row): array {
                $pid = (int) ($row['game_session_player_id'] ?? 0);
                $team = isset($row['team']) ? (int) $row['team'] : null;
                if ($pid <= 0) {
                    return [];
                }

                return [$pid => $team];
            })
            ->all();

        $rows = $playerIds
            ->map(fn (int $id): ?array => $draft->findPlayer($id))
            ->filter()
            ->values();

        if ($rows->count() !== $required) {
            abort(422, 'Some players in this match are no longer on the roster.');
        }

        $blocked = $rows->contains(fn (array $p): bool => ! ($p['is_waiting'] ?? false) || ($p['is_playing'] ?? false));
        if ($blocked) {
            abort(422, 'Queued match players must be waiting and not already on court.');
        }

        if ($session->match_type === 'doubles') {
            $missing = $rows->contains(fn (array $p): bool => ! in_array($lineupTeams[(int) $p['id']] ?? null, [1, 2], true));
            if ($missing) {
                abort(422, 'Doubles match lineup is missing team assignments.');
            }
            $grouped = $rows->groupBy(fn (array $p): int => (int) ($lineupTeams[(int) $p['id']] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        return $rows
            ->values()
            ->map(function (array $p, int $index) use ($session, $lineupTeams): array {
                if ($session->match_type === 'singles') {
                    $team = $lineupTeams[(int) $p['id']] ?? null;
                    $p['team'] = in_array($team, [1, 2], true) ? (int) $team : ($index === 0 ? 1 : 2);
                } else {
                    $p['team'] = (int) $lineupTeams[(int) $p['id']];
                }

                return $p;
            })
            ->all();
    }

    /**
     * Resolve players for a FINISHED match straight from its stored lineup
     * snapshot, independent of the current roster.
     *
     * A finished match is historical: it was already played to completion and
     * its snapshot carries everything needed to recompute results (user_id,
     * guest_name, team). Unlike playersFromStoredLineup (used to START a queued
     * match), this must NOT require players to still be on the roster or in a
     * waiting state — otherwise removing a player mid-session makes the session
     * impossible to end.
     *
     * @return list<array<string, mixed>>
     */
    public function playersFromFinishedSnapshot(
        GameSession $session,
        array $match,
        int $required,
    ): array {
        $lineup = is_array($match['lineup'] ?? null) ? $match['lineup'] : [];

        $rows = collect($lineup)
            ->map(function ($row): ?array {
                if (! is_array($row)) {
                    return null;
                }
                $pid = (int) ($row['game_session_player_id'] ?? 0);
                if ($pid <= 0) {
                    return null;
                }

                $uid = $row['user_id'] ?? null;

                return [
                    'id' => $pid,
                    'user_id' => $uid !== null ? (int) $uid : null,
                    'guest_name' => $row['guest_name'] ?? null,
                    'name' => $row['name'] ?? null,
                    'team' => isset($row['team']) ? (int) $row['team'] : null,
                ];
            })
            ->filter()
            ->values();

        if ($rows->count() !== $required || $rows->pluck('id')->unique()->count() !== $required) {
            abort(422, 'The queued match lineup is invalid.');
        }

        if ($session->match_type === 'doubles') {
            $grouped = $rows->groupBy(fn (array $p): int => (int) ($p['team'] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        return $rows
            ->values()
            ->map(function (array $p, int $index) use ($session): array {
                if ($session->match_type === 'singles') {
                    $team = $p['team'] ?? null;
                    $p['team'] = in_array($team, [1, 2], true) ? (int) $team : ($index === 0 ? 1 : 2);
                } else {
                    $p['team'] = (int) $p['team'];
                }

                return $p;
            })
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $players
     */
    public function displayName(array $player): string
    {
        if (($player['user_id'] ?? null) !== null) {
            return 'Player';
        }

        $guest = trim((string) ($player['guest_name'] ?? ''));

        return $guest !== '' ? $guest : 'Guest';
    }

    public function guestNameExists(QueueingSessionDraft $draft, string $guestName, ?int $excludePlayerId = null): bool
    {
        $needle = Str::lower(trim($guestName));

        foreach ($draft->players as $player) {
            if ($player['is_removed'] ?? false) {
                continue;
            }
            if (($player['user_id'] ?? null) !== null) {
                continue;
            }
            if ($excludePlayerId !== null && (int) ($player['id'] ?? 0) === $excludePlayerId) {
                continue;
            }
            if (Str::lower((string) ($player['guest_name'] ?? '')) === $needle) {
                return true;
            }
        }

        return false;
    }

    public function memberExists(QueueingSessionDraft $draft, int $userId): bool
    {
        foreach ($draft->players as $player) {
            if ($player['is_removed'] ?? false) {
                continue;
            }
            if ((int) ($player['user_id'] ?? 0) === $userId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findRemovedMember(QueueingSessionDraft $draft, int $userId): ?array
    {
        foreach ($draft->players as $player) {
            if (! ($player['is_removed'] ?? false)) {
                continue;
            }
            if ((int) ($player['user_id'] ?? 0) === $userId) {
                return $player;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findRemovedGuest(QueueingSessionDraft $draft, string $guestName): ?array
    {
        $needle = Str::lower(trim($guestName));

        foreach ($draft->players as $player) {
            if (! ($player['is_removed'] ?? false)) {
                continue;
            }
            if (($player['user_id'] ?? null) !== null) {
                continue;
            }
            if (Str::lower((string) ($player['guest_name'] ?? '')) === $needle) {
                return $player;
            }
        }

        return null;
    }
}
