<?php

namespace App\Http\Controllers;

use App\Actions\UpdateQueueingSessionMatch;
use App\Http\Requests\UpdateQueueingSessionMatchRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchUpdateController extends Controller
{
    public function __invoke(
        UpdateQueueingSessionMatchRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        UpdateQueueingSessionMatch $action,
    ): JsonResponse {
        $validated = $request->validated();
        /** @var list<array{id: int, team?: int|null}>} $lineup */
        $lineup = $validated['lineup'];

        $match = $action->execute($gameSession, $queueingSessionMatch, $lineup);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ]);
    }
}
