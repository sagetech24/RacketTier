<?php

namespace App\Http\Controllers;

use App\Actions\ShowPublicQueueingSessionSummary;
use Illuminate\Http\JsonResponse;

class PublicQueueingSessionSummaryController extends Controller
{
    public function show(string $publicKey, ShowPublicQueueingSessionSummary $action): JsonResponse
    {
        return response()->json([
            'data' => $action->execute($publicKey),
        ]);
    }
}
