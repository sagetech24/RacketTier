<?php

namespace App\Http\Controllers;

use App\Actions\RemoveQueueingSessionPlayer;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\DestroyQueueingSessionPlayerRequest;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersDestroyController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        DestroyQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        GameSessionPlayer $gameSessionPlayer,
        RemoveQueueingSessionPlayer $action,
    ): JsonResponse {
        $action->execute($gameSession, $gameSessionPlayer);

        $gameSession->refresh();

        return $this->queueingSessionJson($gameSession);
    }
}
