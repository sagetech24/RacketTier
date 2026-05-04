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
        $startGameSessionMatch->execute($gameSession);

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
