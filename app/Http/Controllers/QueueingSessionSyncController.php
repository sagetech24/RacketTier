<?php

namespace App\Http\Controllers;

use App\Actions\SyncQueueingSessionOutbox;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\SyncQueueingSessionOutboxRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionSyncController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        SyncQueueingSessionOutboxRequest $request,
        GameSession $gameSession,
        SyncQueueingSessionOutbox $action,
    ): JsonResponse {
        $validated = $request->validated();
        /** @var list<array{type: string, payload?: array<string, mixed>}> $mutations */
        $mutations = $validated['mutations'];
        $expected = array_key_exists('draft_version', $validated) && $validated['draft_version'] !== null
            ? (int) $validated['draft_version']
            : null;

        $session = $action->execute($gameSession, $request->user(), $mutations, $expected);

        return $this->queueingSessionJson($session);
    }
}
