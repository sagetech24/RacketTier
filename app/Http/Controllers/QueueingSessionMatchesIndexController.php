<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\ListQueueingSessionMatchesRequest;
use App\Models\GameSession;
use App\Services\QueueingSessionState;
use Illuminate\Http\JsonResponse;

class QueueingSessionMatchesIndexController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __construct(
        private QueueingSessionState $queueingSessionState,
    ) {}

    public function __invoke(
        ListQueueingSessionMatchesRequest $request,
        GameSession $gameSession,
    ): JsonResponse {
        if (! $gameSession->isDraft()) {
            $this->queueingSessionState->reconcileStaleActiveSessionIfDue($gameSession);
        }

        return $this->queueingMatchesJson($gameSession);
    }
}
