<?php

namespace App\Http\Controllers;

use App\Actions\ApproveQueueingSessionAutoSuggestMatch;
use App\Http\Requests\ApproveQueueingSessionAutoSuggestRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionAutoSuggestApproveController extends Controller
{
    public function __invoke(
        ApproveQueueingSessionAutoSuggestRequest $request,
        GameSession $gameSession,
        string $suggestionId,
        ApproveQueueingSessionAutoSuggestMatch $action,
    ): JsonResponse {
        $match = $action->execute($gameSession, $suggestionId);

        return response()->json([
            'data' => new QueueingSessionMatchResource($match),
        ], 201);
    }
}
