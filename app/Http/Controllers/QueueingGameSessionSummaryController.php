<?php

namespace App\Http\Controllers;

use App\Actions\BuildQueueingSessionSummary;
use App\Http\Requests\ShowQueueingSessionSummaryRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionSummaryController extends Controller
{
    public function __invoke(
        ShowQueueingSessionSummaryRequest $request,
        GameSession $gameSession,
        BuildQueueingSessionSummary $action,
    ): JsonResponse {
        return response()->json([
            'data' => $action->execute($gameSession),
        ]);
    }
}
