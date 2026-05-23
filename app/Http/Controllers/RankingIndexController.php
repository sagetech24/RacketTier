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

        $data = $rankings->values()->map(
            fn (Ranking $ranking, int $index): array => $this->formatRankingRow(
                $ranking,
                $index + 1,
                $tiersBySport,
                $walletsByKey
            )
        );

        $viewerRanking = null;
        $authUser = $request->user();
        $sportId = isset($validated['sport_id']) ? (int) $validated['sport_id'] : null;

        if (
            $authUser
            && $sportId !== null
            && $search === ''
            && ! collect($data)->contains(fn (array $row): bool => $row['user']['id'] === (int) $authUser->id)
        ) {
            $viewerModel = Ranking::query()
                ->with([
                    'user:id,name,email',
                    'sport:id,name,slug,code',
                ])
                ->where('user_id', $authUser->id)
                ->where('sport_id', $sportId)
                ->first();

            if ($viewerModel) {
                $globalRank = (int) Ranking::query()
                    ->where('sport_id', $sportId)
                    ->where(function ($query) use ($viewerModel): void {
                        $query->where('rating', '>', $viewerModel->rating)
                            ->orWhere(function ($tieQuery) use ($viewerModel): void {
                                $tieQuery->where('rating', $viewerModel->rating)
                                    ->where('id', '<', $viewerModel->id);
                            });
                    })
                    ->count() + 1;

                $viewerWalletKey = $viewerModel->user_id.'-'.$viewerModel->sport_id;
                if (! $walletsByKey->has($viewerWalletKey)) {
                    $wallet = MemberPointWallet::query()
                        ->where('user_id', $viewerModel->user_id)
                        ->where('sport_id', $viewerModel->sport_id)
                        ->first();
                    if ($wallet) {
                        $walletsByKey->put($viewerWalletKey, $wallet);
                    }
                }

                if (! $tiersBySport->has($viewerModel->sport_id)) {
                    $tiersBySport->put(
                        $viewerModel->sport_id,
                        TierRank::query()
                            ->where('sport_id', $viewerModel->sport_id)
                            ->where('status', true)
                            ->orderBy('tier_no')
                            ->get()
                    );
                }

                $viewerRanking = $this->formatRankingRow(
                    $viewerModel,
                    $globalRank,
                    $tiersBySport,
                    $walletsByKey
                );
            }
        }

        return response()->json([
            'data' => $data,
            'viewer_ranking' => $viewerRanking,
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<int, TierRank>>  $tiersBySport
     * @param  \Illuminate\Support\Collection<string, MemberPointWallet>  $walletsByKey
     * @return array<string, mixed>
     */
    private function formatRankingRow(
        Ranking $ranking,
        int $rank,
        $tiersBySport,
        $walletsByKey
    ): array {
        $walletKey = $ranking->user_id.'-'.$ranking->sport_id;
        /** @var MemberPointWallet|null $wallet */
        $wallet = $walletsByKey->get($walletKey);
        $walletBalance = (int) ($wallet?->balance ?? 0);
        $tier = $tiersBySport
            ->get($ranking->sport_id)
            ?->first(fn (TierRank $tierRow): bool => $tierRow->start_point <= $walletBalance && $tierRow->end_point >= $walletBalance);

        return [
            'rank' => $rank,
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
    }
}
