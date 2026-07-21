<?php

namespace App\Http\Controllers;

use App\Actions\DuplicateQueueingGameSession;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\DuplicateQueueingGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionDuplicateController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        DuplicateQueueingGameSessionRequest $request,
        GameSession $gameSession,
        DuplicateQueueingGameSession $action,
    ): JsonResponse {
        $session = $action->execute($request->user(), $gameSession);
        $session = $this->prepareQueueingSession($session);

        return response()->json([
            'data' => new GameSessionResource($session),
        ], 201);
    }
}
