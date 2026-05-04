<?php

namespace App\Http\Controllers;

use App\Http\Resources\FacilityResource;
use App\Http\Resources\GameSessionResource;
use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityGameRoomController extends Controller
{
    public function index(Request $request, Facility $facility): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $sessions = GameSession::query()
            ->where('facility_id', $facility->id)
            ->where('is_active', true)
            ->with(['sport', 'facility', 'creator:id,name,email'])
            ->withCount('players')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get();

        $sessionIds = $sessions->pluck('id')->all();

        $playerIds = $sessionIds === []
            ? collect()
            : GameSessionPlayer::query()
                ->whereIn('game_session_id', $sessionIds)
                ->distinct()
                ->pluck('user_id');

        $players = $playerIds->isEmpty()
            ? collect()
            : User::query()
                ->whereIn('id', $playerIds->all())
                ->orderBy('name')
                ->get(['id', 'name', 'email']);

        return response()->json([
            'data' => [
                'facility' => new FacilityResource($facility),
                'sessions' => GameSessionResource::collection($sessions),
                'players' => $players->map(fn (User $u): array => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                ]),
            ],
        ]);
    }
}
