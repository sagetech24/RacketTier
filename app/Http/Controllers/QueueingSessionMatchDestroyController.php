<?php

namespace App\Http\Controllers;

use App\Actions\DeleteQueueingSessionMatch;
use App\Http\Requests\DestroyQueueingSessionMatchRequest;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchDestroyController extends Controller
{
    public function __invoke(
        DestroyQueueingSessionMatchRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        DeleteQueueingSessionMatch $action,
    ): JsonResponse {
        $action->execute($gameSession, $queueingSessionMatch);

        return response()->json(['message' => 'Match deleted.']);
    }
}
