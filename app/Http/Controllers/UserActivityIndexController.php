<?php

namespace App\Http\Controllers;

use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserActivityIndexController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $limit = (int) ($validated['limit'] ?? 25);

        $sessions = GameSession::query()
            ->where('status', 'finished')
            ->whereNotNull('last_finished_at')
            ->whereUserIsParticipant($user)
            ->with(['sport', 'facility', 'creator:id,name,email'])
            ->withCount('players')
            ->orderByDesc('last_finished_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => GameSessionResource::collection($sessions),
        ]);
    }
}
