<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionDraftStore;
use App\Services\RebuildQueueingSessionMatchEffects;
use Illuminate\Support\Facades\DB;

class OverrideQueueingSessionMatchLineup
{
    public function __construct(
        private QueueingSessionDraftStore $draftStore,
        private QueueingSessionDraftHydrator $hydrator,
        private RebuildQueueingSessionMatchEffects $rebuild,
    ) {}

    /**
     * Re-team the same finished-match players (no substitutions).
     *
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     */
    public function execute(
        GameSession $session,
        QueueingSessionMatch $match,
        array $manualLineup,
    ): QueueingSessionMatch {
        if (! $session->isQueueing()) {
            abort(422, 'This action only applies to queueing sessions.');
        }

        if ((int) $match->game_session_id !== (int) $session->id) {
            abort(422, 'Match does not belong to this session.');
        }

        if ($session->isDraft()) {
            $hydrated = $this->draftStore->mutate($session, function ($draft) use ($session, $match, $manualLineup) {
                $matchRow = $draft->findMatch((int) $match->id);
                if ($matchRow === null || ($matchRow['status'] ?? '') !== 'finished') {
                    abort(422, 'Only finished matches can update pairing.');
                }

                $winningTeam = (int) ($matchRow['winning_team'] ?? 0);
                if (! in_array($winningTeam, [1, 2], true)) {
                    abort(422, 'Finished match is missing a winning team.');
                }

                $lineup = $this->applyTeamOverride(
                    $session,
                    is_array($matchRow['lineup'] ?? null) ? $matchRow['lineup'] : [],
                    $manualLineup,
                );

                $matchRow['lineup'] = $lineup;
                $breakdown = $this->rebuild->recomputeBreakdown($session, $matchRow);

                foreach ($draft->matches as $i => $row) {
                    if ((int) ($row['id'] ?? 0) === (int) $match->id) {
                        $draft->matches[$i]['lineup'] = $lineup;
                        $draft->matches[$i]['result_breakdown'] = $breakdown;
                        break;
                    }
                }

                $this->rebuild->rebuildDraft($session, $draft);

                return $draft;
            });

            return $this->hydrator->hydrateMatch($hydrated, (int) $match->id);
        }

        return DB::transaction(function () use ($session, $match, $manualLineup): QueueingSessionMatch {
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

            if (! $lockedMatch || $lockedMatch->status !== 'finished') {
                abort(422, 'Only finished matches can update pairing.');
            }

            $winningTeam = (int) ($lockedMatch->winning_team ?? 0);
            if (! in_array($winningTeam, [1, 2], true)) {
                abort(422, 'Finished match is missing a winning team.');
            }

            $lineup = $this->applyTeamOverride(
                $locked,
                is_array($lockedMatch->lineup) ? $lockedMatch->lineup : [],
                $manualLineup,
            );

            $row = [
                'lineup' => $lineup,
                'winning_team' => $winningTeam,
                'team1_score' => $lockedMatch->team1_score,
                'team2_score' => $lockedMatch->team2_score,
            ];
            $breakdown = $this->rebuild->recomputeBreakdown($locked, $row);

            $lockedMatch->update([
                'lineup' => $lineup,
                'result_breakdown' => $breakdown,
            ]);

            $this->rebuild->rebuildPersisted($locked);

            return $lockedMatch->fresh();
        });
    }

    /**
     * @param  list<array<string, mixed>>  $currentLineup
     * @param  list<array{id: int, team?: int|null}>  $manualLineup
     * @return list<array<string, mixed>>
     */
    private function applyTeamOverride(GameSession $session, array $currentLineup, array $manualLineup): array
    {
        $required = $session->match_type === 'doubles' ? 4 : 2;

        $currentIds = collect($currentLineup)
            ->map(fn ($row): int => (int) (is_array($row) ? ($row['game_session_player_id'] ?? 0) : 0))
            ->filter(fn (int $id): bool => $id > 0)
            ->sort()
            ->values();

        $requested = collect($manualLineup)
            ->map(function (array $row): array {
                return [
                    'id' => (int) ($row['id'] ?? 0),
                    'team' => isset($row['team']) ? (int) $row['team'] : null,
                ];
            })
            ->filter(fn (array $row): bool => $row['id'] > 0)
            ->values();

        $requestedIds = $requested->pluck('id')->sort()->values();

        if ($requestedIds->count() !== $required || $requestedIds->unique()->count() !== $required) {
            abort(422, 'Finished match pairing must include the same players.');
        }

        if ($currentIds->count() !== $required || $currentIds->values()->all() !== $requestedIds->values()->all()) {
            abort(422, 'Finished match pairing can only reassign the players who already played.');
        }

        $teamById = $requested->mapWithKeys(
            fn (array $row): array => [$row['id'] => $row['team']],
        );

        $next = [];
        foreach ($currentLineup as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $pid = (int) ($entry['game_session_player_id'] ?? 0);
            if ($pid <= 0) {
                continue;
            }
            $team = $teamById->get($pid);
            if (! in_array($team, [1, 2], true)) {
                abort(422, 'Each player must be assigned to team 1 or team 2.');
            }
            $entry['team'] = $team;
            $next[] = $entry;
        }

        if ($session->match_type === 'doubles') {
            $counts = collect($next)->countBy(fn (array $row): int => (int) $row['team']);
            if ((int) ($counts[1] ?? 0) !== 2 || (int) ($counts[2] ?? 0) !== 2) {
                abort(422, 'Doubles pairing must have two players per team.');
            }
        } else {
            $counts = collect($next)->countBy(fn (array $row): int => (int) $row['team']);
            if ((int) ($counts[1] ?? 0) !== 1 || (int) ($counts[2] ?? 0) !== 1) {
                abort(422, 'Singles pairing must have one player per side.');
            }
        }

        return $next;
    }
}
