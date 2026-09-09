<?php

namespace App\Http\Controllers;

use App\Actions\ReorderQueueingSessionCheckIn;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\ReorderQueueingSessionCheckInRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionCheckInOrderController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        ReorderQueueingSessionCheckInRequest $request,
        GameSession $gameSession,
        ReorderQueueingSessionCheckIn $action,
    ): JsonResponse {
        /** @var list<int> $playerIds */
        $playerIds = array_map(
            fn ($id): int => (int) $id,
            $request->validated('player_ids'),
        );

        $action->execute($gameSession, $playerIds);

        $gameSession->refresh();

        return $this->queueingSessionJson($gameSession);
    }
}
