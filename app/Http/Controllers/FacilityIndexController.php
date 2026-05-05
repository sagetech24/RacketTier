<?php

namespace App\Http\Controllers;

use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityIndexController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $q = trim((string) $request->query('q', ''));

        $query = Facility::query()
            ->withCount('gameSessions')
            ->select('facilities.*')
            ->selectSub(function ($sub): void {
                $sub->from('game_session_players')
                    ->join('game_sessions', 'game_sessions.id', '=', 'game_session_players.game_session_id')
                    ->selectRaw('COUNT(DISTINCT game_session_players.user_id)')
                    ->whereColumn('game_sessions.facility_id', 'facilities.id')
                    ->whereDate('game_sessions.created_at', now()->toDateString());
            }, 'today_checked_in_players_count')
            ->orderBy('name')
            ->limit(80);

        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%'.$q.'%')
                    ->orWhere('address', 'like', '%'.$q.'%');
            });
        }

        return response()->json([
            'data' => FacilityResource::collection($query->get()),
        ]);
    }
}
