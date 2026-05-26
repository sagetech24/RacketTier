<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Models\MemberPointWallet;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class PublicStatsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'total_members' => User::query()->count(),
                'total_queueing_sessions' => GameSession::query()
                    ->where('session_context', 'queueing')
                    ->count(),
                'total_points_awarded' => (int) MemberPointWallet::query()->sum('balance'),
            ],
        ]);
    }
}
