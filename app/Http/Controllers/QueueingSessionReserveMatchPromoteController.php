<?php

namespace App\Http\Controllers;

use App\Actions\PromoteQueueingSessionReserveMatch;
use App\Http\Requests\PromoteQueueingSessionReserveMatchRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionReserveMatchPromoteController extends Controller
{
    public function __invoke(
        PromoteQueueingSessionReserveMatchRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        PromoteQueueingSessionReserveMatch $action,
    ): JsonResponse {
        $match = $action->execute($gameSession, $queueingSessionMatch);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ]);
    }
}
