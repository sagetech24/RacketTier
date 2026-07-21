<?php

namespace App\Http\Controllers;

use App\Actions\AddQueueingSessionPlayer;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\StoreQueueingSessionPlayerRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersStoreController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function store(
        StoreQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        AddQueueingSessionPlayer $action,
    ): JsonResponse {
        $validated = $request->validated();
        $skillLevel = array_key_exists('skill_level', $validated) && $validated['skill_level'] !== null
            ? (int) $validated['skill_level']
            : null;
        $pronoun = isset($validated['pronoun']) && trim((string) $validated['pronoun']) !== ''
            ? trim((string) $validated['pronoun'])
            : null;

        if (isset($validated['guest_name']) && trim((string) $validated['guest_name']) !== '') {
            $action->executeGuest(
                $gameSession,
                trim((string) $validated['guest_name']),
                $pronoun,
                $skillLevel,
            );
        } else {
            $action->executeMember($gameSession, (int) $validated['user_id'], (int) $skillLevel, $pronoun);
        }

        $gameSession->refresh();

        return $this->queueingSessionJson($gameSession);
    }
}
