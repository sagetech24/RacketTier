<?php

namespace App\Http\Controllers;

use App\Actions\EndQueueingGameSession;
use App\Http\Requests\EndQueueingGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionEndController extends Controller
{
    public function __invoke(
        EndQueueingGameSessionRequest $request,
        GameSession $gameSession,
        EndQueueingGameSession $action,
    ): JsonResponse {
        $session = $action->execute($gameSession);

        $session->load([
            'sport',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderByDesc('is_playing')->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $session->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($session),
        ]);
    }
}
