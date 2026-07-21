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
        $skillLevel = array_key_exists('skill_level', $validated) && $validated['skill_level'] !== null
            ? (int) $validated['skill_level']
            : null;

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
            $action->executeMember($gameSession, $gameSessionPlayer, (int) $skillLevel);
        }

        $gameSession->refresh();

        return $this->queueingSessionJson($gameSession);
    }
}
