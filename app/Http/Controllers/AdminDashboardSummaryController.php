<?php

namespace App\Http\Controllers;

use App\Actions\GetAdminDashboardSummary;
use Illuminate\Http\JsonResponse;

class AdminDashboardSummaryController extends Controller
{
    public function __invoke(GetAdminDashboardSummary $summary): JsonResponse
    {
        return response()->json([
            'data' => $summary->execute(),
        ]);
    }
}
