<?php

namespace App\Actions;

use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\Sport;
use App\Models\TierRank;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EnrichFacilityPlayers
{
    /**
     * Member profile fields for invite directories: ELO, global leaderboard rank,
     * tier for that sport, and most-played sport (match volume, else highest rating).
     *
     * @param  list<int>  $userIds
     * @return array<int, array{
     *     primary_sport: array{id: int, name: string, slug: string, code: string, icon: string}|null,
     *     rating: int|null,
     *     rank: int|null,
     *     tier: array{id: int, tier_no: int, name: string}|null,
     *     total_point_balance: int,
     *     stats: array{wins: int, losses: int, total_matches: int}
     * }>
     */
    public function execute(array $userIds): array
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return [];
        }

        $primarySportIdByUser = $this->primarySportIdsByUser($userIds);

        $rankings = Ranking::query()
            ->whereIn('user_id', $userIds)
            ->get(['id', 'user_id', 'sport_id', 'rating']);

        $bestRankingSportByUser = $this->highestRatedSportByUser($rankings);

        $sportIdByUser = [];
        foreach ($userIds as $userId) {
            $sportIdByUser[$userId] = $primarySportIdByUser[$userId]
                ?? $bestRankingSportByUser[$userId]
                ?? null;
        }

        $sportIds = array_values(array_unique(array_filter($sportIdByUser)));
        $sportsById = $sportIds === []
            ? collect()
            : Sport::query()->whereIn('id', $sportIds)->get()->keyBy('id');

        $rankByUserSport = $this->ranksByUserSport($sportIds, $rankings);
        $tierByUser = $this->tiersByUser($sportIdByUser, $userIds, $sportIds);
        $pointsByUser = $this->totalPointsByUser($userIds);
        $statsByUser = $this->matchStatsByUser($userIds);
        $maxRatingByUser = $this->maxRatingByUser($rankings);

        $out = [];
        foreach ($userIds as $userId) {
            $sportId = $sportIdByUser[$userId] ?? null;
            /** @var Sport|null $sport */
            $sport = $sportId !== null ? $sportsById->get($sportId) : null;
            $stats = $statsByUser[$userId] ?? ['wins' => 0, 'losses' => 0, 'total_matches' => 0];

            $out[$userId] = [
                'primary_sport' => $sport ? [
                    'id' => (int) $sport->id,
                    'name' => (string) $sport->name,
                    'slug' => (string) $sport->slug,
                    'code' => (string) $sport->code,
                    'icon' => (string) $sport->icon,
                ] : null,
                'rating' => $maxRatingByUser[$userId] ?? null,
                'rank' => $sportId !== null
                    ? ($rankByUserSport[$userId.'-'.$sportId] ?? null)
                    : null,
                'tier' => $tierByUser[$userId] ?? null,
                'total_point_balance' => $pointsByUser[$userId] ?? 0,
                'stats' => $stats,
            ];
        }

        return $out;
    }

    /**
     * @param  list<int>  $userIds
     * @return array<int, int>
     */
    private function primarySportIdsByUser(array $userIds): array
    {
        $played = GameSessionPlayer::query()
            ->join('game_sessions', 'game_sessions.id', '=', 'game_session_players.game_session_id')
            ->whereIn('game_session_players.user_id', $userIds)
            ->whereNotNull('game_sessions.sport_id')
            ->groupBy('game_session_players.user_id', 'game_sessions.sport_id')
            ->select([
                'game_session_players.user_id',
                'game_sessions.sport_id',
                DB::raw('SUM(game_session_players.wins_count + game_session_players.losses_count) as matches_played'),
                DB::raw('MAX(game_sessions.last_finished_at) as last_played_at'),
            ])
            ->havingRaw('SUM(game_session_players.wins_count + game_session_players.losses_count) > 0')
            ->get();

        /** @var Collection<int, Collection<int, object>> $byUser */
        $byUser = $played->groupBy(fn ($row): int => (int) $row->user_id);

        $primary = [];
        foreach ($byUser as $userId => $rows) {
            $best = $rows->sort(function ($a, $b): int {
                $matchCmp = (int) $b->matches_played <=> (int) $a->matches_played;
                if ($matchCmp !== 0) {
                    return $matchCmp;
                }
                $timeCmp = strcmp((string) ($b->last_played_at ?? ''), (string) ($a->last_played_at ?? ''));
                if ($timeCmp !== 0) {
                    return $timeCmp;
                }

                return (int) $a->sport_id <=> (int) $b->sport_id;
            })->first();
            if ($best === null) {
                continue;
            }
            $primary[(int) $userId] = (int) $best->sport_id;
        }

        return $primary;
    }

    /**
     * @param  Collection<int, Ranking>  $rankings
     * @return array<int, int>
     */
    private function highestRatedSportByUser(Collection $rankings): array
    {
        $best = [];
        foreach ($rankings as $row) {
            $userId = (int) $row->user_id;
            $current = $best[$userId] ?? null;
            if (
                $current === null
                || (int) $row->rating > $current['rating']
                || ((int) $row->rating === $current['rating'] && (int) $row->sport_id < $current['sport_id'])
            ) {
                $best[$userId] = [
                    'rating' => (int) $row->rating,
                    'sport_id' => (int) $row->sport_id,
                ];
            }
        }

        return array_map(fn (array $row): int => $row['sport_id'], $best);
    }

    /**
     * @param  Collection<int, Ranking>  $rankings
     * @return array<int, int>
     */
    private function maxRatingByUser(Collection $rankings): array
    {
        $max = [];
        foreach ($rankings as $row) {
            $userId = (int) $row->user_id;
            $rating = (int) $row->rating;
            if (! isset($max[$userId]) || $rating > $max[$userId]) {
                $max[$userId] = $rating;
            }
        }

        return $max;
    }

    /**
     * @param  list<int>  $userIds
     * @return array<int, int>
     */
    private function totalPointsByUser(array $userIds): array
    {
        return MemberPointWallet::query()
            ->whereIn('user_id', $userIds)
            ->groupBy('user_id')
            ->select([
                'user_id',
                DB::raw('COALESCE(SUM(balance), 0) as total'),
            ])
            ->pluck('total', 'user_id')
            ->map(fn ($total): int => (int) $total)
            ->all();
    }

    /**
     * @param  list<int>  $userIds
     * @return array<int, array{wins: int, losses: int, total_matches: int}>
     */
    private function matchStatsByUser(array $userIds): array
    {
        $rows = GameSessionPlayer::query()
            ->whereIn('user_id', $userIds)
            ->groupBy('user_id')
            ->select([
                'user_id',
                DB::raw('COALESCE(SUM(wins_count), 0) as wins'),
                DB::raw('COALESCE(SUM(losses_count), 0) as losses'),
            ])
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $wins = (int) $row->wins;
            $losses = (int) $row->losses;
            $out[(int) $row->user_id] = [
                'wins' => $wins,
                'losses' => $losses,
                'total_matches' => $wins + $losses,
            ];
        }

        return $out;
    }

    /**
     * Global board position per sport (rating desc, then ranking id asc) for members who have a row.
     *
     * @param  list<int>  $sportIds
     * @param  Collection<int, Ranking>  $memberRankings
     * @return array<string, int>
     */
    private function ranksByUserSport(array $sportIds, Collection $memberRankings): array
    {
        if ($sportIds === [] || $memberRankings->isEmpty()) {
            return [];
        }

        $boards = Ranking::query()
            ->whereIn('sport_id', $sportIds)
            ->orderBy('sport_id')
            ->orderByDesc('rating')
            ->orderBy('id')
            ->get(['id', 'user_id', 'sport_id', 'rating']);

        $wanted = [];
        foreach ($memberRankings as $row) {
            $sportId = (int) $row->sport_id;
            if (! in_array($sportId, $sportIds, true)) {
                continue;
            }
            $wanted[((int) $row->user_id).'-'.$sportId] = true;
        }

        $ranks = [];
        $positionBySport = [];
        foreach ($boards as $row) {
            $sportId = (int) $row->sport_id;
            $positionBySport[$sportId] = ($positionBySport[$sportId] ?? 0) + 1;
            $key = ((int) $row->user_id).'-'.$sportId;
            if (! isset($wanted[$key])) {
                continue;
            }
            $ranks[$key] = $positionBySport[$sportId];
        }

        return $ranks;
    }

    /**
     * @param  array<int, int|null>  $sportIdByUser
     * @param  list<int>  $userIds
     * @param  list<int>  $sportIds
     * @return array<int, array{id: int, tier_no: int, name: string}|null>
     */
    private function tiersByUser(array $sportIdByUser, array $userIds, array $sportIds): array
    {
        if ($sportIds === []) {
            return [];
        }

        $wallets = MemberPointWallet::query()
            ->whereIn('user_id', $userIds)
            ->whereIn('sport_id', $sportIds)
            ->get(['user_id', 'sport_id', 'balance'])
            ->keyBy(fn (MemberPointWallet $w): string => ((int) $w->user_id).'-'.((int) $w->sport_id));

        $tiersBySport = TierRank::query()
            ->whereIn('sport_id', $sportIds)
            ->where('status', true)
            ->orderBy('tier_no')
            ->get()
            ->groupBy('sport_id');

        $out = [];
        foreach ($userIds as $userId) {
            $sportId = $sportIdByUser[$userId] ?? null;
            if ($sportId === null) {
                $out[$userId] = null;

                continue;
            }

            $balance = (int) ($wallets->get($userId.'-'.$sportId)?->balance ?? 0);
            /** @var Collection<int, TierRank>|null $tiers */
            $tiers = $tiersBySport->get($sportId);
            $tier = $tiers?->first(
                fn (TierRank $row): bool => $row->start_point <= $balance && $row->end_point >= $balance
            );

            $out[$userId] = $tier ? [
                'id' => (int) $tier->id,
                'tier_no' => (int) $tier->tier_no,
                'name' => (string) $tier->name,
            ] : null;
        }

        return $out;
    }
}
