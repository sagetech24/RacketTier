<?php

namespace App\Services;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\MemberPointWallet;
use App\Models\Sport;
use App\Models\TierRank;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ReferenceDataCache
{
    private const SPORTS_TTL_SECONDS = 3600;

    private const TIERS_TTL_SECONDS = 3600;

    private const PUBLIC_STATS_TTL_SECONDS = 300;

    private const FACILITY_INDEX_TTL_SECONDS = 300;

    /**
     * @return Collection<int, Sport>
     */
    public function sports(): Collection
    {
        $rows = Cache::remember('reference:sports:v2', self::SPORTS_TTL_SECONDS, function (): array {
            return Sport::query()
                ->orderBy('id')
                ->get(['id', 'slug', 'name', 'code', 'icon'])
                ->map(fn (Sport $sport): array => $sport->getAttributes())
                ->all();
        });

        return Sport::hydrate($rows);
    }

    /**
     * @return Collection<int, TierRank>
     */
    public function tierRanksForSport(int $sportId): Collection
    {
        $rows = Cache::remember(
            'reference:tier_ranks:v2:'.$sportId,
            self::TIERS_TTL_SECONDS,
            fn (): array => TierRank::query()
                ->where('sport_id', $sportId)
                ->where('status', true)
                ->orderBy('tier_no')
                ->get()
                ->map(fn (TierRank $tier): array => $tier->getAttributes())
                ->all(),
        );

        return TierRank::hydrate($rows);
    }

    /**
     * @return array{total_members: int, total_queueing_sessions: int, total_points_awarded: int}
     */
    public function publicStats(): array
    {
        return Cache::remember('reference:public_stats', self::PUBLIC_STATS_TTL_SECONDS, function (): array {
            return [
                'total_members' => User::query()->count(),
                'total_queueing_sessions' => GameSession::query()
                    ->where('session_context', 'queueing')
                    ->count(),
                'total_points_awarded' => (int) MemberPointWallet::query()->sum('balance'),
            ];
        });
    }

    /**
     * Cached only for unfiltered lists (common dashboard path).
     *
     * @return EloquentCollection<int, Facility>
     */
    public function facilitiesIndexUnfiltered(): EloquentCollection
    {
        $rows = Cache::remember('reference:facilities_index:v2', self::FACILITY_INDEX_TTL_SECONDS, function (): array {
            return $this->buildFacilitiesQuery('')
                ->get()
                ->map(fn (Facility $facility): array => $facility->getAttributes())
                ->all();
        });

        return Facility::hydrate($rows);
    }

    /**
     * @return Builder<Facility>
     */
    public function buildFacilitiesQuery(string $searchQuery)
    {
        $query = Facility::query()
            ->withCount('gameSessions')
            ->withCount([
                'gameSessions as today_matches_count' => function ($sub): void {
                    $sub->whereDate('created_at', now()->toDateString());
                },
            ])
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

        if ($searchQuery !== '') {
            $query->where(function ($sub) use ($searchQuery): void {
                $sub->where('name', 'like', '%'.$searchQuery.'%')
                    ->orWhere('address', 'like', '%'.$searchQuery.'%');
            });
        }

        return $query;
    }
}
