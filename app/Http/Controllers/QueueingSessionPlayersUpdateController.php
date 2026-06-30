<?php

namespace App\Http\Controllers;

use App\Actions\UpdateQueueingSessionPlayer;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\UpdateQueueingSessionPlayerRequest;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersUpdateController extends Controller
{
    use PreparesQueueingSessionResponse;

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

        return $this->queueingSessionJson($gameSession);
    }
}
