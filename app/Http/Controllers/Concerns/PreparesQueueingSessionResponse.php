<?php

namespace App\Http\Controllers\Concerns;

use App\Actions\EnrichGameSessionPlayers;
use App\Http\Resources\GameSessionResource;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Services\QueueingSessionDraftHydrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

trait PreparesQueueingSessionResponse
{
    protected function queueingSessionJson(GameSession $session): JsonResponse
    {
        $session = $this->prepareQueueingSession($session);

        return response()->json([
            'data' => new GameSessionResource($session),
        ]);
    }

    /**
     * @return JsonResponse
     */
    protected function queueingMatchesJson(GameSession $session): JsonResponse
    {
        $session = $this->prepareQueueingSession($session);
        $matches = app(QueueingSessionDraftHydrator::class)->hydrateMatches($session);

        return response()->json([
            'data' => QueueingSessionMatchResource::collection($matches),
        ]);
    }

    protected function prepareQueueingSession(GameSession $session): GameSession
    {
        if ($session->isDraft()) {
            $session = app(QueueingSessionDraftHydrator::class)->hydrate($session);
        } else {
            $session->load([
                'sport',
                'facility',
                'creator:id,name,email',
                'players' => fn ($q) => $q->orderByDesc('is_playing')->orderBy('queue_position'),
                'players.user:id,name,email',
            ]);
            $session->loadCount('players');
        }

        if (! $session->relationLoaded('sport')) {
            $session->load(['sport', 'creator:id,name,email']);
        }

        app(EnrichGameSessionPlayers::class)->apply($session);

        return $session;
    }
}
