<?php

namespace App\Actions;

use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\TierRank;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class GetSportRankings
{
    private const BOARD_CACHE_TTL_SECONDS = 60;

    /**
     * @return array{data: list<array<string, mixed>>, viewer_ranking: array<string, mixed>|null}
     */
    public function execute(?int $sportId, string $search, int $limit, ?User $viewer): array
    {
        $search = trim($search);
        $board = $this->boardRows($sportId, $search, $limit);

        return [
            'data' => $board,
            'viewer_ranking' => $this->viewerRankingRow($board, $sportId, $search, $viewer),
        ];
    }

    public static function bumpSportVersion(int $sportId): void
    {
        Cache::forever(
            self::versionKey($sportId),
            (int) Cache::get(self::versionKey($sportId), 1) + 1
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function boardRows(?int $sportId, string $search, int $limit): array
    {
        if ($search !== '') {
            return $this->queryBoardRows($sportId, $search, $limit);
        }

        $version = (int) Cache::get(self::versionKey($sportId), 1);
        $cacheKey = sprintf(
            'rankings:board:v%d:sport:%s:limit:%d',
            $version,
            $sportId === null ? 'all' : (string) $sportId,
            $limit
        );

        /** @var list<array<string, mixed>> */
        return Cache::remember(
            $cacheKey,
            self::BOARD_CACHE_TTL_SECONDS,
            fn (): array => $this->queryBoardRows($sportId, '', $limit)
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function queryBoardRows(?int $sportId, string $search, int $limit): array
    {
        $rankings = Ranking::query()
            ->with([
                'user:id,name,email',
                'sport:id,name,slug,code',
            ])
            ->when(
                $sportId !== null,
                fn ($q) => $q->where('sport_id', $sportId)
            )
            ->when(
                $search !== '',
                fn ($q) => $q->whereHas('user', fn ($userQ) => $userQ->where('name', 'like', '%'.$search.'%'))
            )
            ->orderByDesc('rating')
            ->orderBy('id')
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

        return $rankings->values()->map(
            fn (Ranking $ranking, int $index): array => $this->formatRankingRow(
                $ranking,
                $index + 1,
                $tiersBySport,
                $walletsByKey
            )
        )->all();
    }

    /**
     * @param  list<array<string, mixed>>  $board
     * @return array<string, mixed>|null
     */
    private function viewerRankingRow(array $board, ?int $sportId, string $search, ?User $viewer): ?array
    {
        if ($viewer === null || $sportId === null || $search !== '') {
            return null;
        }

        if (collect($board)->contains(fn (array $row): bool => $row['user']['id'] === (int) $viewer->id)) {
            return null;
        }

        $viewerModel = Ranking::query()
            ->with([
                'user:id,name,email',
                'sport:id,name,slug,code',
            ])
            ->where('user_id', $viewer->id)
            ->where('sport_id', $sportId)
            ->first();

        if (! $viewerModel) {
            return null;
        }

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

        $walletsByKey = collect();
        $wallet = MemberPointWallet::query()
            ->where('user_id', $viewerModel->user_id)
            ->where('sport_id', $viewerModel->sport_id)
            ->first();
        if ($wallet) {
            $walletsByKey->put($viewerModel->user_id.'-'.$viewerModel->sport_id, $wallet);
        }

        $tiersBySport = collect([
            $viewerModel->sport_id => TierRank::query()
                ->where('sport_id', $viewerModel->sport_id)
                ->where('status', true)
                ->orderBy('tier_no')
                ->get(),
        ]);

        return $this->formatRankingRow(
            $viewerModel,
            $globalRank,
            $tiersBySport,
            $walletsByKey
        );
    }

    /**
     * @param  Collection<int, Collection<int, TierRank>>  $tiersBySport
     * @param  Collection<string, MemberPointWallet>  $walletsByKey
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

    private static function versionKey(?int $sportId): string
    {
        return 'rankings:board:version:sport:'.($sportId === null ? 'all' : (string) $sportId);
    }
}
