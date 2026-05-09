<?php

namespace App\Http\Controllers;

use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameSessionShowController extends Controller
{
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
