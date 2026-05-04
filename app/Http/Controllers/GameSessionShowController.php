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
        if (isset($validated['facility_id']) && (int) $validated['facility_id'] !== (int) $gameSession->facility_id) {
            abort(404);
        }

        $gameSession->load([
            'sport',
            'facility',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $gameSession->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($gameSession),
        ]);
    }
}
