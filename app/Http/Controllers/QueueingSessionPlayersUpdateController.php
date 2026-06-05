<?php

namespace App\Http\Controllers;

use App\Actions\UpdateQueueingSessionPlayer;
use App\Http\Requests\UpdateQueueingSessionPlayerRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersUpdateController extends Controller
{
    public function __invoke(
        UpdateQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        GameSessionPlayer $gameSessionPlayer,
        UpdateQueueingSessionPlayer $action,
    ): JsonResponse {
        $validated = $request->validated();
        $skillLevel = (int) $validated['skill_level'];

        if ($gameSessionPlayer->isGuest()) {
            $pronoun = isset($validated['pronoun']) && trim((string) $validated['pronoun']) !== ''
                ? trim((string) $validated['pronoun'])
                : null;

            $action->executeGuest(
                $gameSession,
                $gameSessionPlayer,
                trim((string) $validated['guest_name']),
                $pronoun,
                $skillLevel,
            );
        } else {
            $action->executeMember($gameSession, $gameSessionPlayer, $skillLevel);
        }

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
