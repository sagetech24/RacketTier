<?php

namespace App\Http\Controllers;

use App\Actions\FinishGameSessionMatch;
use App\Http\Requests\FinishGameSessionMatchRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class GameSessionFinishMatchController extends Controller
{
    public function __invoke(
        FinishGameSessionMatchRequest $request,
        GameSession $gameSession,
        FinishGameSessionMatch $finishGameSessionMatch,
    ): JsonResponse {
        $validated = $request->validated();

        $finishGameSessionMatch->execute(
            $gameSession,
            (int) $validated['team1_score'],
            (int) $validated['team2_score'],
        );

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
