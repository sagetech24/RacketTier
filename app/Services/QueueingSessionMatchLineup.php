<?php

namespace App\Services;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\User;
use Illuminate\Support\Collection;

class QueueingSessionMatchLineup
{
    /**
     * Player ids reserved in other queueing (not yet started) matches.
     *
     * @return list<int>
     */
    public function reservedPlayerIds(int $gameSessionId, ?int $excludeMatchId = null): array
    {
        $matches = QueueingSessionMatch::query()
            ->where('game_session_id', $gameSessionId)
            ->where('status', 'queueing')
            ->when($excludeMatchId !== null, fn ($q) => $q->where('id', '!=', $excludeMatchId))
            ->get(['lineup']);

        $ids = [];
        foreach ($matches as $match) {
            $lineup = is_array($match->lineup) ? $match->lineup : [];
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
     * @param  Collection<int, GameSessionPlayer>  $players
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     * @param  list<int>  $allowPlayingPlayerIds  On-court player ids already in this ongoing match.
     * @return Collection<int, GameSessionPlayer>
     */
    public function resolveManualLineup(
        GameSession $session,
        Collection $players,
        array $manualLineup,
        int $required,
        ?int $excludeReservedMatchId = null,
        array $allowPlayingPlayerIds = [],
    ): Collection {
        if (count($manualLineup) !== $required) {
            abort(422, "Manual lineup must include exactly {$required} players.");
        }

        $ids = collect($manualLineup)->pluck('id')->map(fn ($id): int => (int) $id);
        if ($ids->unique()->count() !== $ids->count()) {
            abort(422, 'Manual lineup contains duplicate players.');
        }

        $reserved = $this->reservedPlayerIds((int) $session->id, $excludeReservedMatchId);
        $reservedHit = $ids->first(fn (int $id): bool => in_array($id, $reserved, true));
        if ($reservedHit !== null) {
            abort(422, 'One or more players are already assigned to a queued match.');
        }

        $picked = collect();
        foreach ($manualLineup as $i => $spec) {
            $id = (int) ($spec['id'] ?? 0);
            $row = $players->firstWhere('id', $id);
            if (! $row instanceof GameSessionPlayer) {
                abort(422, 'Invalid player id in manual lineup.');
            }
            if ((int) $row->game_session_id !== (int) $session->id) {
                abort(422, 'Invalid player id in manual lineup.');
            }
            $isCurrentOnCourt = in_array($id, $allowPlayingPlayerIds, true);
            if (! $isCurrentOnCourt && (! $row->is_waiting || $row->is_playing)) {
                abort(422, $row->is_playing
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

            $clone = clone $row;
            $clone->team = $team;
            $picked->push($clone);
        }

        if ($session->match_type === 'doubles') {
            $g = $picked->groupBy(fn (GameSessionPlayer $p): int => (int) $p->team);
            if ($g->count() !== 2 || $g->get(1)?->count() !== 2 || $g->get(2)?->count() !== 2) {
                abort(422, 'Doubles manual lineup requires two players on team 1 and two on team 2.');
            }
        }

        return $picked;
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $picked
     * @return array<int, array<string, mixed>>
     */
    public function buildSnapshot(Collection $picked): array
    {
        $memberNames = User::query()
            ->whereIn('id', $picked->pluck('user_id')->filter()->values()->all())
            ->pluck('name', 'id');

        return $picked
            ->map(function (GameSessionPlayer $p) use ($memberNames): array {
                return [
                    'game_session_player_id' => (int) $p->id,
                    'user_id' => $p->user_id !== null ? (int) $p->user_id : null,
                    'guest_name' => $p->guest_name,
                    'name' => $p->user_id !== null ? (string) ($memberNames[$p->user_id] ?? 'Player') : $p->displayName(),
                    'team' => $p->team !== null ? (int) $p->team : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, GameSessionPlayer>
     */
    public function playersFromStoredLineup(GameSession $session, QueueingSessionMatch $match, int $required): Collection
    {
        $lineup = is_array($match->lineup) ? $match->lineup : [];
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

        /** @var Collection<int, GameSessionPlayer> $rows */
        $rows = GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->whereIn('id', $playerIds->all())
            ->lockForUpdate()
            ->get()
            ->sortBy(fn (GameSessionPlayer $p): int => (int) $playerIds->search((int) $p->id))
            ->values();

        if ($rows->count() !== $required) {
            abort(422, 'Some players in this match are no longer on the roster.');
        }

        $blocked = $rows->contains(fn (GameSessionPlayer $p): bool => ! $p->is_waiting || $p->is_playing);
        if ($blocked) {
            abort(422, 'Queued match players must be waiting and not already on court.');
        }

        if ($session->match_type === 'doubles') {
            $missing = $rows->contains(fn (GameSessionPlayer $p): bool => ! in_array($lineupTeams[$p->id] ?? null, [1, 2], true));
            if ($missing) {
                abort(422, 'Doubles match lineup is missing team assignments.');
            }
            $grouped = $rows->groupBy(fn (GameSessionPlayer $p): int => (int) ($lineupTeams[$p->id] ?? 0));
            if ($grouped->get(1)?->count() !== 2 || $grouped->get(2)?->count() !== 2) {
                abort(422, 'Doubles match lineup must have two players per team.');
            }
        }

        return $rows->map(function (GameSessionPlayer $p, int $index) use ($session, $lineupTeams): GameSessionPlayer {
            $clone = clone $p;
            if ($session->match_type === 'singles') {
                $team = $lineupTeams[$p->id] ?? null;
                $clone->team = in_array($team, [1, 2], true) ? (int) $team : ($index === 0 ? 1 : 2);
            } else {
                $clone->team = (int) $lineupTeams[$p->id];
            }

            return $clone;
        });
    }
}
