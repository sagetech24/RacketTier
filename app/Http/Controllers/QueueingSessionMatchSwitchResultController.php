<?php

namespace App\Http\Controllers;

use App\Actions\SwitchQueueingSessionMatchResult;
use App\Http\Requests\SwitchQueueingSessionMatchResultRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchSwitchResultController extends Controller
{
    public function __invoke(
        SwitchQueueingSessionMatchResultRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        SwitchQueueingSessionMatchResult $action,
    ): JsonResponse {
        $match = $action->execute($gameSession, $queueingSessionMatch);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ]);
    }
}
