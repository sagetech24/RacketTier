<?php

namespace App\Http\Controllers;

use App\Actions\UpdateQueueingGameSession;
use App\Http\Requests\UpdateQueueingGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionUpdateController extends Controller
{
    public function __invoke(
        UpdateQueueingGameSessionRequest $request,
        GameSession $gameSession,
        UpdateQueueingGameSession $action,
    ): JsonResponse {
        $user = $request->user();
        abort_if(! $user, 401);

        $session = $action->execute(
            $user,
            $gameSession,
            $request->validated('queue_name'),
            (int) $request->validated('win_points'),
            (int) $request->validated('loss_points'),
            (bool) $request->boolean('skip_scores'),
        );

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
