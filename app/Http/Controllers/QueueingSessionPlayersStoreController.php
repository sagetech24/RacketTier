<?php

namespace App\Http\Controllers;

use App\Actions\AddQueueingSessionPlayer;
use App\Http\Requests\StoreQueueingSessionPlayerRequest;
use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersStoreController extends Controller
{
    public function store(
        StoreQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        AddQueueingSessionPlayer $action,
    ): JsonResponse {
        $validated = $request->validated();
        if (isset($validated['guest_name']) && trim((string) $validated['guest_name']) !== '') {
            $action->executeGuest($gameSession, trim((string) $validated['guest_name']));
        } else {
            $action->executeMember($gameSession, (int) $validated['user_id']);
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
