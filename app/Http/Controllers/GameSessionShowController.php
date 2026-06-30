<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Models\GameSession;
use App\Services\QueueingSessionDraftHydrator;
use App\Services\QueueingSessionState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameSessionShowController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __construct(
        private QueueingSessionState $queueingSessionState,
    ) {}

    public function show(Request $request, GameSession $gameSession): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'facility_id' => ['sometimes', 'integer', 'exists:facilities,id'],
        ]);

        $qFacility = $validated['facility_id'] ?? null;
        if ($qFacility !== null && $qFacility !== '' && $gameSession->facility_id !== null) {
            if ((int) $qFacility !== (int) $gameSession->facility_id) {
                abort(404);
            }
            if ($gameSession->is_active) {
                return $this->sessionResponse($gameSession);
            }
        }

        if (! $gameSession->userCanView($user)) {
            abort(404);
        }

        return $this->sessionResponse($gameSession);
    }

    private function sessionResponse(GameSession $gameSession): JsonResponse
    {
        if (! $gameSession->isDraft() && $this->queueingSessionState->reconcileStaleActiveSessionIfDue($gameSession)) {
            $gameSession->refresh();
        }

        return $this->queueingSessionJson($gameSession);
    }
}
