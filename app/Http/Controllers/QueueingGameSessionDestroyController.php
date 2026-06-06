<?php

namespace App\Http\Controllers;

use App\Actions\DeleteQueueingGameSession;
use App\Http\Requests\DestroyQueueingGameSessionRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionDestroyController extends Controller
{
    public function __invoke(
        DestroyQueueingGameSessionRequest $request,
        GameSession $gameSession,
        DeleteQueueingGameSession $action,
    ): JsonResponse {
        $user = $request->user();
        abort_if(! $user, 401);

        $action->execute($user, $gameSession);

        return response()->json(['message' => 'Queueing session deleted.']);
    }
}
