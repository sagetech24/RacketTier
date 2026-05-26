<?php

namespace App\Http\Controllers;

use App\Actions\GetQueueingSessionHistory;
use App\Http\Resources\GameSessionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueueingGameSessionHistoryController extends Controller
{
    public function __invoke(Request $request, GetQueueingSessionHistory $action): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'cursor' => ['nullable', 'string', 'max:512'],
            'q' => ['nullable', 'string', 'max:120'],
            'mine_only' => ['nullable', 'boolean'],
        ]);

        $result = $action->execute(
            user: $user,
            cursor: isset($validated['cursor']) ? (string) $validated['cursor'] : null,
            limit: (int) ($validated['limit'] ?? 15),
            search: isset($validated['q']) ? trim((string) $validated['q']) : null,
            mineOnly: (bool) ($validated['mine_only'] ?? false),
        );

        return response()->json([
            'data' => GameSessionResource::collection($result['items']),
            'meta' => [
                'next_cursor' => $result['next_cursor'],
                'has_more' => $result['has_more'],
            ],
        ]);
    }
}
