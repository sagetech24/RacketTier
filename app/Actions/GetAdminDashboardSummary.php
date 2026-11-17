<?php

namespace App\Actions;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GetAdminDashboardSummary
{
    /**
     * @return array{
     *   total_members: int,
     *   unverified_members: int,
     *   total_facilities: int,
     *   active_queueing_sessions: int,
     *   matches_finished_today: int,
     *   queueing_sessions_ended_today: int
     * }
     */
    public function execute(): array
    {
        $tz = (string) config('app.timezone');
        $startOfToday = Carbon::now($tz)->startOfDay();
        $endOfToday = Carbon::now($tz)->endOfDay();

        return [
            'total_members' => User::query()->count(),
            'unverified_members' => User::query()->whereNull('email_verified_at')->count(),
            'total_facilities' => Facility::query()->count(),
            'active_queueing_sessions' => GameSession::query()
                ->where('session_context', 'queueing')
                ->where('is_active', true)
                ->count(),
            'matches_finished_today' => GameSession::query()
                ->where('session_context', 'facility')
                ->where('status', 'finished')
                ->whereBetween('ended_at', [$startOfToday, $endOfToday])
                ->count()
                + (int) DB::table('queueing_session_matches')
                    ->where('status', 'finished')
                    ->whereBetween('updated_at', [$startOfToday, $endOfToday])
                    ->count(),
            'queueing_sessions_ended_today' => GameSession::query()
                ->where('session_context', 'queueing')
                ->where('is_active', false)
                ->whereBetween('ended_at', [$startOfToday, $endOfToday])
                ->count(),
        ];
    }
}
