<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListQueueingSessionMatchesRequest;
use App\Http\Resources\QueueingSessionMatchResource;
use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
use App\Services\QueueingSessionState;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchesIndexController extends Controller
{
    public function __construct(
        private QueueingSessionState $queueingSessionState,
    ) {}

    public function __invoke(
        ListQueueingSessionMatchesRequest $request,
        GameSession $gameSession,
    ): JsonResponse {
        $this->queueingSessionState->reconcileStaleActiveSession($gameSession);

        $matches = QueueingSessionMatch::query()
            ->where('game_session_id', $gameSession->id)
            ->orderByDesc('match_no')
            ->get();

        return response()->json([
            'data' => QueueingSessionMatchResource::collection($matches),
        ]);
    }
}
