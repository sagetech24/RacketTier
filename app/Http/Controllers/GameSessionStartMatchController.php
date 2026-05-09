<?php

namespace App\Http\Controllers;

use App\Actions\StartGameSessionMatch;
use App\Http\Requests\StartGameSessionMatchRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class GameSessionStartMatchController extends Controller
{
    public function __invoke(StartGameSessionMatchRequest $request, GameSession $gameSession, StartGameSessionMatch $startGameSessionMatch): JsonResponse
    {
        $validated = $request->validated();
        $lineup = isset($validated['lineup']) && is_array($validated['lineup']) && $validated['lineup'] !== []
            ? $validated['lineup']
            : null;

        $startGameSessionMatch->execute($gameSession, $lineup);

        $gameSession->refresh();
        $gameSession->load([
            'sport',
            'facility',
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
