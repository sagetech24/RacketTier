<?php

namespace App\Http\Controllers;

use App\Actions\CreateQueueingSessionMatch;
use App\Http\Requests\StoreQueueingSessionMatchRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchesStoreController extends Controller
{
    public function __invoke(
        StoreQueueingSessionMatchRequest $request,
        GameSession $gameSession,
        CreateQueueingSessionMatch $action,
    ): JsonResponse {
        $validated = $request->validated();
        /** @var list<array{id: int, team?: int|null}>} $lineup */
        $lineup = $validated['lineup'];

        $match = $action->execute($gameSession, $lineup);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ], 201);
    }
}
