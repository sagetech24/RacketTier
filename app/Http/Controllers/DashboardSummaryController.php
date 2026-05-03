<?php

namespace App\Http\Controllers;

use App\Actions\GetDashboardSummary;
use Illuminate\Http\JsonResponse;

class DashboardSummaryController extends Controller
{
    public function show(GetDashboardSummary $getDashboardSummary): JsonResponse
    {
        $user = auth()->user();
        abort_if(! $user, 401);

        return response()->json($getDashboardSummary->execute($user));
    }
}
