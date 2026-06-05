<?php

namespace App\Http\Controllers;

use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\TierRank;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FacilityPlayersController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'sport_id' => ['sometimes', 'nullable', 'integer', 'exists:sports,id'],
        ]);

        $q = trim((string) $request->query('q', ''));

        $includeMe = $request->boolean('include_me');

        $sportId = isset($validated['sport_id']) ? (int) $validated['sport_id'] : null;

        $query = User::query()
            ->when(! $includeMe, fn ($q) => $q->whereKeyNot($user->id))
            ->orderBy('name')
            ->limit(60);

        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%');
            });
        }

        $rows = $query->get(['id', 'name', 'email', 'pronoun']);

        $tierRows = collect();
        $balancesByUserId = [];
        $statsByUserId = [];
        if ($sportId !== null && $rows->isNotEmpty()) {
            $userIds = $rows->pluck('id')->all();
            $balancesByUserId = MemberPointWallet::query()
                ->where('sport_id', $sportId)
                ->whereIn('user_id', $userIds)
                ->pluck('balance', 'user_id')
                ->all();

            $tierRows = TierRank::query()
                ->where('sport_id', $sportId)
                ->where('status', true)
                ->orderBy('tier_no')
                ->get();

            $statsByUserId = GameSessionPlayer::query()
                ->join('game_sessions', 'game_sessions.id', '=', 'game_session_players.game_session_id')
                ->whereIn('game_session_players.user_id', $userIds)
                ->where('game_sessions.sport_id', $sportId)
                ->groupBy('game_session_players.user_id')
                ->select([
                    'game_session_players.user_id',
                    DB::raw('COALESCE(SUM(game_session_players.wins_count), 0) as wins'),
                    DB::raw('COALESCE(SUM(game_session_players.losses_count), 0) as losses'),
                ])
                ->get()
                ->keyBy('user_id')
                ->all();
        }

        $players = $rows->map(function (User $u) use ($sportId, $balancesByUserId, $tierRows, $statsByUserId): array {
            $base = [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'pronoun' => $u->pronoun,
            ];

            if ($sportId === null) {
                return $base;
            }

            $balance = (int) ($balancesByUserId[$u->id] ?? 0);
            $tier = $tierRows->first(
                fn (TierRank $row): bool => $row->start_point <= $balance && $row->end_point >= $balance
            );

            $base['tier'] = $tier ? [
                'id' => (int) $tier->id,
                'tier_no' => (int) $tier->tier_no,
                'name' => (string) $tier->name,
            ] : null;

            $statRow = $statsByUserId[$u->id] ?? null;
            $wins = $statRow ? (int) $statRow->wins : 0;
            $losses = $statRow ? (int) $statRow->losses : 0;

            $base['stats'] = [
                'wins' => $wins,
                'losses' => $losses,
                'total_matches' => $wins + $losses,
            ];

            return $base;
        });

        return response()->json(['data' => $players]);
    }
}
