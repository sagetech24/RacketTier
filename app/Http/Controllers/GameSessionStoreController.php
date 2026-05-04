<?php

namespace App\Http\Controllers;

use App\Actions\CreateGameSession;
use App\Http\Requests\StoreGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use Illuminate\Http\JsonResponse;

class GameSessionStoreController extends Controller
{
    public function store(StoreGameSessionRequest $request, CreateGameSession $createGameSession): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $court = $request->validated('court_preference');

        $result = $createGameSession->execute(
            $user,
            (int) $request->validated('facility_id'),
            $request->validated('sport_slug'),
            $request->validated('match_type'),
            $request->validated('game_type'),
            $court !== null && $court !== '' ? $court : null,
            $request->validated('player_ids'),
        );

        $session = $result['session'];
        $session->load([
            'sport',
            'facility',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $session->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($session),
        ], 201);
    }
}
