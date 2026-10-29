<?php

namespace App\Http\Controllers;

use App\Actions\OverrideQueueingSessionMatchLineup;
use App\Http\Requests\OverrideQueueingSessionMatchLineupRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchFinishedLineupController extends Controller
{
    public function __invoke(
        OverrideQueueingSessionMatchLineupRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        OverrideQueueingSessionMatchLineup $action,
    ): JsonResponse {
        $validated = $request->validated();
        /** @var list<array{id: int, team?: int|null}> $lineup */
        $lineup = $validated['lineup'];

        $match = $action->execute($gameSession, $queueingSessionMatch, $lineup);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ]);
    }
}
