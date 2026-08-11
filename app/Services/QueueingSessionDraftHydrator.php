<?php

namespace App\Services;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class QueueingSessionDraftHydrator
{
    /**
     * Overlay roster / completed-match counts from the live draft onto list envelopes
     * without hydrating player models (for index cards).
     *
     * Draft sessions keep players and matches in the snapshot, so Eloquent
     * `withCount('players')` stays at 0 until the session is persisted.
     *
     * @param  iterable<int, GameSession>  $sessions
     */
    public function applyListCounts(iterable $sessions): void
    {
        $store = app(QueueingSessionDraftStore::class);

        foreach ($sessions as $session) {
            if (! $session instanceof GameSession || ! $session->isDraft()) {
                continue;
            }

            $draft = $store->load((int) $session->id);
            $activeCount = collect($draft->players)
                ->filter(fn (array $p): bool => ! ($p['is_removed'] ?? false))
                ->count();
            $session->setAttribute('players_count', $activeCount);
            $session->completed_matches_count = (int) ($draft->sessionMeta['completed_matches_count'] ?? 0);
        }
    }

    public function hydrate(GameSession $envelope): GameSession
    {
        if (! $envelope->isDraft()) {
            return $envelope;
        }

        $draft = app(QueueingSessionDraftStore::class)->load((int) $envelope->id);
        $meta = $draft->sessionMeta;

        $envelope->status = (string) ($meta['status'] ?? $envelope->status);
        $envelope->completed_matches_count = (int) ($meta['completed_matches_count'] ?? 0);
        $envelope->last_team1_score = $meta['last_team1_score'] ?? null;
        $envelope->last_team2_score = $meta['last_team2_score'] ?? null;
        $envelope->last_winning_team = $meta['last_winning_team'] ?? null;
        $envelope->last_finished_at = isset($meta['last_finished_at'])
            ? Carbon::parse((string) $meta['last_finished_at'])
            : null;
        $envelope->last_result_breakdown = is_array($meta['last_result_breakdown'] ?? null)
            ? $meta['last_result_breakdown']
            : null;

        $memberIds = collect($draft->players)
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $usersById = $memberIds === []
            ? collect()
            : User::query()->whereIn('id', $memberIds)->get(['id', 'name', 'email'])->keyBy('id');

        $players = collect($draft->players)->map(function (array $row) use ($envelope, $usersById): GameSessionPlayer {
            $player = new GameSessionPlayer([
                'game_session_id' => $envelope->id,
                'user_id' => $row['user_id'] ?? null,
                'guest_name' => $row['guest_name'] ?? null,
                'pronoun' => $row['pronoun'] ?? null,
                'skill_level' => $row['skill_level'] ?? null,
                'queue_position' => (int) ($row['queue_position'] ?? 0),
                'is_waiting' => (bool) ($row['is_waiting'] ?? true),
                'is_playing' => (bool) ($row['is_playing'] ?? false),
                'team' => $row['team'] ?? null,
                'wins_count' => (int) ($row['wins_count'] ?? 0),
                'losses_count' => (int) ($row['losses_count'] ?? 0),
                'last_match_result' => $row['last_match_result'] ?? null,
                'last_match_id' => isset($row['last_match_id']) ? (int) $row['last_match_id'] : null,
                'session_points' => (int) ($row['session_points'] ?? 0),
            ]);
            $player->id = (int) $row['id'];
            $player->exists = true;
            $player->setAttribute('is_removed', (bool) ($row['is_removed'] ?? false));
            if (! empty($row['checked_in_at'])) {
                $player->setAttribute('created_at', Carbon::parse((string) $row['checked_in_at']));
            }
            $uid = $row['user_id'] ?? null;
            if ($uid !== null && $usersById->has((int) $uid)) {
                $player->setRelation('user', $usersById->get((int) $uid));
            }

            return $player;
        })->sortBy([
            ['is_playing', 'desc'],
            ['queue_position', 'asc'],
        ])->values();

        $envelope->setRelation('players', $players);
        $envelope->setAttribute(
            'players_count',
            $players->filter(fn (GameSessionPlayer $p): bool => ! (bool) $p->getAttribute('is_removed'))->count(),
        );

        return $envelope;
    }

    /**
     * @return Collection<int, QueueingSessionMatch>
     */
    public function hydrateMatches(GameSession $envelope): Collection
    {
        if (! $envelope->isDraft()) {
            return $envelope->queueingMatches()->orderBy('match_no')->get();
        }

        $draft = app(QueueingSessionDraftStore::class)->load((int) $envelope->id);

        return collect($draft->matches)->map(function (array $row) use ($envelope): QueueingSessionMatch {
            $match = new QueueingSessionMatch([
                'game_session_id' => $envelope->id,
                'match_no' => (int) ($row['match_no'] ?? 0),
                'status' => (string) ($row['status'] ?? 'queueing'),
                'lineup' => is_array($row['lineup'] ?? null) ? $row['lineup'] : [],
                'team1_score' => $row['team1_score'] ?? null,
                'team2_score' => $row['team2_score'] ?? null,
                'winning_team' => $row['winning_team'] ?? null,
                'started_at' => isset($row['started_at']) ? Carbon::parse((string) $row['started_at']) : null,
                'finished_at' => isset($row['finished_at']) ? Carbon::parse((string) $row['finished_at']) : null,
                'result_breakdown' => is_array($row['result_breakdown'] ?? null) ? $row['result_breakdown'] : null,
            ]);
            $match->id = (int) $row['id'];
            $match->exists = true;

            return $match;
        })->sortBy('match_no')->values();
    }

    public function hydratePlayer(GameSession $envelope, int $playerId): GameSessionPlayer
    {
        $hydrated = $this->hydrate($envelope);
        $player = $hydrated->players->firstWhere('id', $playerId);
        if (! $player instanceof GameSessionPlayer) {
            abort(404);
        }

        return $player;
    }

    public function hydrateMatch(GameSession $envelope, int $matchId): QueueingSessionMatch
    {
        $match = $this->hydrateMatches($envelope)->firstWhere('id', $matchId);
        if (! $match instanceof QueueingSessionMatch) {
            abort(404);
        }

        return $match;
    }
}
