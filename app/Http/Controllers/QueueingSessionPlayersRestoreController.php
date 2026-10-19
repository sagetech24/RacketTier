<?php

namespace App\Http\Controllers;

use App\Actions\RestoreQueueingSessionPlayer;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\RestoreQueueingSessionPlayerRequest;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use Illuminate\Http\JsonResponse;

class QueueingSessionPlayersRestoreController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        RestoreQueueingSessionPlayerRequest $request,
        GameSession $gameSession,
        GameSessionPlayer $gameSessionPlayer,
        RestoreQueueingSessionPlayer $action,
    ): JsonResponse {
        $action->execute($gameSession, $gameSessionPlayer);

        $gameSession->refresh();

        return $this->queueingSessionJson($gameSession);
    }
}
