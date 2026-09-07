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
            $request->has('skip_scores')
                ? (bool) $request->boolean('skip_scores')
                : (bool) ($gameSession->skip_scores ?? false),
            $request->has('optional_guest_skill')
                ? (bool) $request->boolean('optional_guest_skill')
                : (bool) ($gameSession->optional_guest_skill ?? true),
            $request->has('optional_guest_gender')
                ? (bool) $request->boolean('optional_guest_gender')
                : (bool) ($gameSession->optional_guest_gender ?? true),
            $request->hasAnyAutoMatchCriteriaInput() ? $request->autoMatchCriteria() : null,
            is_string($request->validated('match_type')) ? (string) $request->validated('match_type') : null,
        );

        return $this->queueingSessionJson($session);
    }
}
