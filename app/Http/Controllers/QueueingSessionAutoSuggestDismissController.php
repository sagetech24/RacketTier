<?php

namespace App\Http\Controllers;

use App\Actions\DismissQueueingSessionAutoSuggestMatch;
use App\Http\Requests\DismissQueueingSessionAutoSuggestRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionAutoSuggestDismissController extends Controller
{
    public function __invoke(
        DismissQueueingSessionAutoSuggestRequest $request,
        GameSession $gameSession,
        string $suggestionId,
        DismissQueueingSessionAutoSuggestMatch $action,
    ): JsonResponse {
        $session = $action->execute($gameSession, $suggestionId);

        return response()->json([
            'data' => new GameSessionResource($session),
        ]);
    }
}
