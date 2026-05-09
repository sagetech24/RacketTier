<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StartGameSessionMatch
{
    /**
     * @param  list<array{id: int, team?: int|null}>|null  $manualLineup  When set, must list exactly N waiting players (FIFO order ignored).
     */
    public function execute(GameSession $session, ?array $manualLineup = null): GameSession
    {
        if (! $session->is_active) {
            abort(422, 'This session is not active.');
        }

        $required = $session->match_type === 'doubles' ? 4 : 2;

        return DB::transaction(function () use ($session, $required, $manualLineup): GameSession {
            /** @var GameSession $locked */
            $locked = GameSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->firstOrFail();

            $players = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->orderBy('queue_position')
                ->lockForUpdate()
                ->get();

            if ($manualLineup !== null && $manualLineup !== []) {
                $picked = $this->resolveManualLineup($locked, $players, $manualLineup, $required);
            } else {
                $eligible = $players
                    ->filter(fn (GameSessionPlayer $p): bool => $p->is_waiting && ! $p->is_playing)
                    ->values();

                if ($eligible->count() < $required) {
                    abort(
                        422,
                        "Need at least {$required} waiting player".($required > 1 ? 's' : '').' to start.'
                    );
                }

                $picked = $eligible->take($required);
            }

            $slot = 1000;
            foreach ($picked as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'is_playing' => true,
                    'is_waiting' => false,
                    'queue_position' => $slot++,
                    'team' => $row->team,
                ]);
            }

            if ($locked->isQueueing()) {
                $nextMatchNo = (int) QueueingSessionMatch::query()
                    ->where('game_session_id', $locked->id)
                    ->max('match_no') + 1;

                QueueingSessionMatch::query()->create([
                    'game_session_id' => $locked->id,
                    'match_no' => $nextMatchNo,
                    'status' => 'ongoing',
                    'lineup' => $this->buildLineupSnapshot($picked),
                    'started_at' => now(),
                ]);
            }

            $waitingRows = GameSessionPlayer::query()
                ->where('game_session_id', $locked->id)
                ->where('is_waiting', true)
                ->where('is_playing', false)
                ->orderBy('queue_position')
                ->get();

            $pos = 1;
            foreach ($waitingRows as $row) {
                GameSessionPlayer::query()->whereKey($row->id)->update([
                    'queue_position' => $pos++,
                ]);
            }

            GameSession::query()->whereKey($locked->id)->update([
                'status' => 'ongoing',
            ]);

            return $locked->fresh();
        });
    }

    /**
     * @param  Collection<int, GameSessionPlayer>  $players
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     * @return Collection<int, GameSessionPlayer>
     */
    private function resolveManualLineup(
        GameSession $locked,
        Collection $players,
        array $manualLineup,
        int $required,
    ): Collection {
        if (count($manualLineup) !== $required) {
            abort(422, "Manual lineup must include exactly {$required} players.");
        }

        $ids = collect($manualLineup)->pluck('id')->map(fn ($id): int => (int) $id);
        if ($ids->unique()->count() !== $ids->count()) {
            abort(422, 'Manual lineup contains duplicate players.');
        }

        $picked = collect();
        foreach ($manualLineup as $i => $spec) {
            $id = (int) ($spec['id'] ?? 0);
            $row = $players->firstWhere('id', $id);
            if (! $row instanceof GameSessionPlayer) {
                abort(422, 'Invalid player id in manual lineup.');
            }
            if ((int) $row->game_session_id !== (int) $locked->id) {
                abort(422, 'Invalid player id in manual lineup.');
            }
            if (! $row->is_waiting || $row->is_playing) {
                abort(422, 'Manual lineup players must be waiting and not already on court.');
            }

            $team = $spec['team'] ?? null;
            if ($locked->match_type === 'singles') {
                $team = $i === 0 ? 1 : 2;
            }
            if ($team !== 1 && $team !== 2) {
                abort(422, 'Each doubles player must include team 1 or 2 in the manual lineup.');
            }

            $clone = clone $row;
            $clone->team = $team;
            $picked->push($clone);
        }

        if ($locked->match_type === 'doubles') {
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
    private function buildLineupSnapshot(Collection $picked): array
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
}
