<?php

namespace App\Http\Controllers;

use App\Actions\CreateQueueingSessionReserveMatch;
use App\Http\Requests\StoreQueueingSessionReserveMatchRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionReserveMatchesStoreController extends Controller
{
    public function __invoke(
        StoreQueueingSessionReserveMatchRequest $request,
        GameSession $gameSession,
        CreateQueueingSessionReserveMatch $action,
    ): JsonResponse {
        $validated = $request->validated();
        /** @var list<array{id: int, team?: int|null}> $lineup */
        $lineup = $validated['lineup'];

        $match = $action->execute($gameSession, $lineup);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ], 201);
    }
}
