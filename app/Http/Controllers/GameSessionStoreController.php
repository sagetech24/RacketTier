<?php

namespace App\Http\Controllers;

use App\Actions\CreateGameSession;
use App\Http\Requests\StoreGameSessionRequest;
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
            $request->validated('sport_slug'),
            $request->validated('match_type'),
            $request->validated('game_type'),
            $court !== null && $court !== '' ? $court : null,
            $request->validated('player_ids'),
        );

        $session = $result['session'];

        return response()->json([
            'data' => [
                'id' => $session->id,
                'sport' => [
                    'slug' => $session->sport?->slug,
                    'name' => $session->sport?->name,
                ],
                'match_type' => $session->match_type,
                'game_type' => $session->game_type,
                'court_preference' => $session->court_preference,
                'is_active' => $session->is_active,
                'created_by' => $session->created_by,
                'players' => $result['players'],
            ],
        ], 201);
    }
}
