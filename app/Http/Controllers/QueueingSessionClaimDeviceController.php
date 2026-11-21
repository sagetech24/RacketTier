<?php

namespace App\Http\Controllers;

use App\Actions\ClaimQueueingSessionDevice;
use App\Http\Controllers\Concerns\PreparesQueueingSessionResponse;
use App\Http\Requests\ClaimQueueingSessionDeviceRequest;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class QueueingSessionClaimDeviceController extends Controller
{
    use PreparesQueueingSessionResponse;

    public function __invoke(
        ClaimQueueingSessionDeviceRequest $request,
        GameSession $gameSession,
        ClaimQueueingSessionDevice $action,
    ): JsonResponse {
        $session = $action->execute(
            $gameSession,
            $request->user(),
            (string) $request->validated('device_id'),
        );

        return $this->queueingSessionJson($session);
    }
}
