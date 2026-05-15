<?php

namespace App\Http\Controllers;

use App\Actions\CreateQueueingGameSession;
use App\Http\Requests\StoreQueueingGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionStoreController extends Controller
{
    public function store(StoreQueueingGameSessionRequest $request, CreateQueueingGameSession $action): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $result = $action->execute(
            $user,
            $request->validated('queue_name'),
            $request->validated('sport_slug'),
            $request->validated('match_type'),
            (int) $request->validated('win_points'),
            (int) $request->validated('loss_points'),
        );

        $session = $result['session'];
        $session->load([
            'sport',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderByDesc('is_playing')->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $session->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($session),
        ], 201);
    }
}
