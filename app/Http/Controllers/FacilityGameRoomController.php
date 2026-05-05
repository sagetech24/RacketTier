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
use Illuminate\Support\Carbon;

class FacilityGameRoomController extends Controller
{
    public function index(Request $request, Facility $facility): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $tz = (string) config('app.timezone');
        $startOfToday = Carbon::now($tz)->startOfDay();
        $endOfToday = Carbon::now($tz)->endOfDay();

        $sessions = GameSession::query()
            ->where('facility_id', $facility->id)
            ->where('is_active', true)
            ->whereBetween('created_at', [$startOfToday, $endOfToday])
            ->with(['sport', 'facility', 'creator:id,name,email'])
            ->withCount('players')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get();

        $playersPayload = $this->playersForFacilityToday(
            (int) $facility->id,
            $startOfToday,
            $endOfToday,
        );

        return response()->json([
            'data' => [
                'facility' => new FacilityResource($facility),
                'sessions' => GameSessionResource::collection($sessions),
                'players' => $playersPayload,
            ],
        ]);
    }

    /**
     * Unique users in this facility's sessions created today, with playing / in-queue flags.
     * Sort: currently playing first, then in queue, then others; name within each group.
     *
     * @return array<int, array{id: int, name: string, email: string, is_playing: bool, is_in_queue: bool}>
     */
    private function playersForFacilityToday(int $facilityId, Carbon $startOfToday, Carbon $endOfToday): array
    {
        $sessionIds = GameSession::query()
            ->where('facility_id', $facilityId)
            ->whereBetween('created_at', [$startOfToday, $endOfToday])
            ->pluck('id')
            ->all();

        return $this->playersForSessionsToday($sessionIds);
    }

    /**
     * @return array<int, array{id: int, name: string, email: string, is_playing: bool, is_in_queue: bool}>
     */
    private function playersForSessionsToday(array $sessionIds): array
    {
        if ($sessionIds === []) {
            return [];
        }

        $byUser = GameSessionPlayer::query()
            ->whereIn('game_session_id', $sessionIds)
            ->get(['user_id', 'is_playing', 'is_waiting'])
            ->groupBy('user_id');

        $aggregates = [];
        foreach ($byUser as $userId => $rows) {
            $userId = (int) $userId;
            $playing = $rows->contains(fn (GameSessionPlayer $p): bool => $p->is_playing);
            $inQueue = ! $playing
                && $rows->contains(
                    fn (GameSessionPlayer $p): bool => $p->is_waiting && ! $p->is_playing,
                );
            $aggregates[$userId] = [
                'playing' => $playing,
                'in_queue' => $inQueue,
            ];
        }

        if ($aggregates === []) {
            return [];
        }

        $users = User::query()
            ->whereIn('id', array_keys($aggregates))
            ->get(['id', 'name', 'email'])
            ->keyBy('id');

        $rows = [];
        foreach ($aggregates as $uid => $flags) {
            $model = $users->get($uid);
            if ($model === null) {
                continue;
            }
            $rows[] = [
                'id' => $model->id,
                'name' => $model->name,
                'email' => $model->email,
                'is_playing' => $flags['playing'],
                'is_in_queue' => $flags['in_queue'],
            ];
        }

        usort(
            $rows,
            static function (array $a, array $b): int {
                $rank = static function (array $r): int {
                    if ($r['is_playing']) {
                        return 0;
                    }
                    if ($r['is_in_queue']) {
                        return 1;
                    }

                    return 2;
                };
                $ra = $rank($a);
                $rb = $rank($b);
                if ($ra !== $rb) {
                    return $ra <=> $rb;
                }

                return strcasecmp((string) $a['name'], (string) $b['name']);
            },
        );

        return $rows;
    }
}
