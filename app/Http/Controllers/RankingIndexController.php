<?php

namespace App\Http\Controllers;

use App\Models\Ranking;
use App\Models\MemberPointWallet;
use App\Models\TierRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RankingIndexController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sport_id' => ['nullable', 'integer', 'exists:sports,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $limit = (int) ($validated['limit'] ?? 50);
        $search = isset($validated['search']) ? trim((string) $validated['search']) : '';

        $baseQuery = Ranking::query()
            ->with([
                'user:id,name,email',
                'sport:id,name,slug,code',
            ])
            ->when(
                isset($validated['sport_id']),
                fn ($q) => $q->where('sport_id', (int) $validated['sport_id'])
            )
            ->when(
                $search !== '',
                fn ($q) => $q->whereHas('user', fn ($userQ) => $userQ->where('name', 'like', '%'.$search.'%'))
            )
            ->orderByDesc('rating')
            ->orderBy('id');

        $rankings = $baseQuery
            ->limit($limit)
            ->get();

        $sportIds = $rankings->pluck('sport_id')->unique()->values();
        $userIds = $rankings->pluck('user_id')->unique()->values();

        $walletsByKey = MemberPointWallet::query()
            ->whereIn('sport_id', $sportIds)
            ->whereIn('user_id', $userIds)
            ->get()
            ->keyBy(fn (MemberPointWallet $wallet): string => $wallet->user_id.'-'.$wallet->sport_id);

        $tiersBySport = TierRank::query()
            ->whereIn('sport_id', $sportIds)
            ->where('status', true)
            ->orderBy('tier_no')
            ->get()
            ->groupBy('sport_id');

        $data = $rankings->values()->map(function (Ranking $ranking, int $index) use ($tiersBySport, $walletsByKey): array {
            $walletKey = $ranking->user_id.'-'.$ranking->sport_id;
            /** @var MemberPointWallet|null $wallet */
            $wallet = $walletsByKey->get($walletKey);
            $walletBalance = (int) ($wallet?->balance ?? 0);
            $tier = $tiersBySport
                ->get($ranking->sport_id)
                ?->first(fn (TierRank $tierRow): bool => $tierRow->start_point <= $walletBalance && $tierRow->end_point >= $walletBalance);

            return [
                'rank' => $index + 1,
                'rating' => (int) $ranking->rating,
                'wallet_balance' => $walletBalance,
                'user' => [
                    'id' => (int) $ranking->user_id,
                    'name' => $ranking->user?->name ?? 'Player',
                    'email' => $ranking->user?->email,
                ],
                'sport' => [
                    'id' => (int) $ranking->sport_id,
                    'name' => $ranking->sport?->name,
                    'slug' => $ranking->sport?->slug,
                    'code' => $ranking->sport?->code,
                ],
                'tier' => $tier ? [
                    'id' => (int) $tier->id,
                    'tier_no' => (int) $tier->tier_no,
                    'name' => (string) $tier->name,
                    'start_point' => (int) $tier->start_point,
                    'end_point' => (int) $tier->end_point,
                ] : null,
            ];
        });

        return response()->json(['data' => $data]);
    }
}
