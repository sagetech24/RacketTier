<?php

namespace App\Http\Controllers;

use App\Actions\FinishGameSessionMatch;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\FinishGameSessionMatchRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class GameSessionFinishMatchController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        FinishGameSessionMatchRequest $request,
        GameSession $gameSession,
        FinishGameSessionMatch $finishGameSessionMatch,
    ): JsonResponse {
        $validated = $request->validated();
        $matchId = isset($validated['queueing_session_match_id'])
            ? (int) $validated['queueing_session_match_id']
            : null;

        if ($gameSession->isQueueing() && (bool) $gameSession->skip_scores) {
            $gameSession = $finishGameSessionMatch->execute(
                $gameSession,
                null,
                null,
                $matchId,
                (int) $validated['winning_team'],
            );
        } else {
            $gameSession = $finishGameSessionMatch->execute(
                $gameSession,
                (int) $validated['team1_score'],
                (int) $validated['team2_score'],
                $matchId,
            );
        }

        if (! $gameSession->isDraft()) {
            $gameSession->refresh();
        }

        return $this->queueingSessionJson($gameSession);
    }
}
