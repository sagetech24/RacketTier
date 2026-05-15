<?php

namespace App\Http\Controllers;

use App\Actions\StartQueueingSessionMatch;
use App\Http\Requests\StartQueueingSessionMatchRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchStartController extends Controller
{
    public function __invoke(
        StartQueueingSessionMatchRequest $request,
        GameSession $gameSession,
        QueueingSessionMatch $queueingSessionMatch,
        StartQueueingSessionMatch $action,
    ): JsonResponse {
        $action->execute($gameSession, $queueingSessionMatch);

        $gameSession->refresh();
        $gameSession->load([
            'sport',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderByDesc('is_playing')->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $gameSession->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($gameSession),
        ]);
    }
}
