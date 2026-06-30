<?php

namespace App\Http\Controllers;

use App\Actions\AutoGenerateQueueingSessionMatches;
use App\Http\Requests\ShowQueueingSessionAutoProposalsRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionAutoProposalsController extends Controller
{
    public function __invoke(
        ShowQueueingSessionAutoProposalsRequest $request,
        GameSession $gameSession,
        AutoGenerateQueueingSessionMatches $action,
    ): JsonResponse {
        $result = $action->execute($gameSession, $request->criteria($gameSession));

        return response()->json([
            'data' => $result,
        ]);
    }
}
