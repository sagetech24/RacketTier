<?php

namespace App\Http\Controllers;

use App\Actions\RemoveQueueingSessionPlayer;
use App\Http\Requests\DestroyQueueingSessionPlayerRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersDestroyController extends Controller
{
    public function __invoke(
        DestroyQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        GameSessionPlayer $gameSessionPlayer,
        RemoveQueueingSessionPlayer $action,
    ): JsonResponse {
        $action->execute($gameSession, $gameSessionPlayer);

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
