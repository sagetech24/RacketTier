<?php

namespace App\Http\Controllers;

use App\Actions\UpdateQueueingGameSession;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\UpdateQueueingGameSessionRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingGameSessionUpdateController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        UpdateQueueingGameSessionRequest $request,
        GameSession $gameSession,
        UpdateQueueingGameSession $action,
    ): JsonResponse {
        $user = $request->user();
        abort_if(! $user, 401);

        $session = $action->execute(
            $user,
            $gameSession,
            $request->validated('queue_name'),
            (int) $request->validated('win_points'),
            (int) $request->validated('loss_points'),
            (bool) $request->boolean('skip_scores'),
            $request->has('optional_guest_skill')
                ? (bool) $request->boolean('optional_guest_skill')
                : (bool) ($gameSession->optional_guest_skill ?? true),
            $request->has('optional_guest_gender')
                ? (bool) $request->boolean('optional_guest_gender')
                : (bool) ($gameSession->optional_guest_gender ?? true),
            $request->hasAnyAutoMatchCriteriaInput() ? $request->autoMatchCriteria() : null,
        );

        return $this->queueingSessionJson($session);
    }
}
