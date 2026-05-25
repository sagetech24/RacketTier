<?php

namespace App\Actions;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\TierRank;
use App\Models\User;

class GetDashboardSummary
{
    /**
     * @return array{
     *   user: array{id: int, name: string, email: string, age: int|null, pronoun: string|null, member_since: string|null, member_since_human: string|null},
     *   stats: array{
     *     rating: int,
     *     matches_played: int,
     *     matches_won: int,
     *     sessions_active: int
     *   },
     *   primary_sport: array{id: int, name: string, slug: string, code: string}|null,
     *   tier: array{id: int, tier_no: int, name: string, start_point: int, end_point: int, wallet_balance: int}|null,
     *   total_point_balance: int,
     *   highlights: array<int, array{title: string, meta: string}>
     * }
     */
    public function execute(User $user): array
    {
        $totalPointBalance = (int) MemberPointWallet::query()
            ->where('user_id', $user->id)
            ->sum('balance');

        $rating = (int) (Ranking::query()->where('user_id', $user->id)->max('rating') ?? 1000);

        $playerAgg = GameSessionPlayer::query()
            ->where('user_id', $user->id)
            ->selectRaw('COALESCE(SUM(wins_count), 0) as wins_sum, COALESCE(SUM(losses_count), 0) as losses_sum')
            ->first();
        $wins = (int) ($playerAgg?->wins_sum ?? 0);
        $losses = (int) ($playerAgg?->losses_sum ?? 0);

        $sessionsActive = GameSession::query()
            ->where('is_active', true)
            ->where(function ($q) use ($user): void {
                $q->where('created_by', $user->id)
                    ->orWhereHas('players', function ($p) use ($user): void {
                        $p->where('user_id', $user->id);
                    });
            })
            ->count();

        $recent = GameSession::query()
            ->where('status', 'finished')
            ->whereNotNull('last_finished_at')
            ->whereUserIsParticipant($user)
            ->with(['facility:id,name', 'sport:id,name,slug,code'])
            ->orderByDesc('last_finished_at')
            ->limit(3)
            ->get();

        $primarySport = $recent->first()?->sport;
        $primarySportId = $primarySport?->id !== null ? (int) $primarySport->id : null;
        $walletBalance = 0;
        $tier = null;
        if ($primarySportId !== null) {
            $walletBalance = (int) (MemberPointWallet::query()
                ->where('user_id', $user->id)
                ->where('sport_id', $primarySportId)
                ->value('balance') ?? 0);

            $tierRow = TierRank::tierForPoints($primarySportId, $walletBalance);
            if ($tierRow) {
                $tier = [
                    'id' => (int) $tierRow->id,
                    'tier_no' => (int) $tierRow->tier_no,
                    'name' => (string) $tierRow->name,
                    'start_point' => (int) $tierRow->start_point,
                    'end_point' => (int) $tierRow->end_point,
                    'wallet_balance' => $walletBalance,
                ];
            }
        }

        $highlights = $recent->map(function (GameSession $s) use ($user): array {
            $sportName = $s->sport?->name ?? 'Sport';
            $facilityName = $s->facility?->name ?? 'Facility';
            $finishedAt = $s->last_finished_at?->toIso8601String() ?? '';

            $won = null;
            $sessionPoints = null;
            $ratingChange = null;
            $breakdown = is_array($s->last_result_breakdown) ? $s->last_result_breakdown : null;
            if (is_array($breakdown) && isset($breakdown['players']) && is_array($breakdown['players'])) {
                foreach ($breakdown['players'] as $p) {
                    if (! is_array($p)) {
                        continue;
                    }
                    if ((int) ($p['user_id'] ?? 0) === (int) $user->id) {
                        $won = isset($p['won']) ? (bool) $p['won'] : null;
                        $sessionPoints = isset($p['session_points_earned']) ? (int) $p['session_points_earned'] : null;
                        $ratingChange = isset($p['rating_change']) ? (int) $p['rating_change'] : null;
                        break;
                    }
                }
            }

            $title = ($won === true ? 'Won' : ($won === false ? 'Lost' : 'Finished'))
                .' '.$sportName.' match at '.$facilityName;

            $metaParts = [];
            if ($sessionPoints !== null) {
                $metaParts[] = 'Earned pts: +'.$sessionPoints.' pts';
            }
            if ($ratingChange !== null) {
                $metaParts[] = 'Rating Chg: '.($ratingChange >= 0 ? '+' : '').$ratingChange;
            }
            $meta = $metaParts !== [] ? implode(' • ', $metaParts) : ($finishedAt !== '' ? 'Match complete' : 'Match complete');

            return [
                'title' => $title,
                'meta' => $meta,
                'finished_at' => $finishedAt !== '' ? $finishedAt : null,
            ];
        })->values()->all();

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'age' => $user->age !== null ? (int) $user->age : null,
                'pronoun' => $user->pronoun,
                'member_since' => $user->created_at?->toIso8601String(),
                'member_since_human' => $user->created_at?->diffForHumans(),
            ],
            'stats' => [
                'rating' => $rating,
                'matches_played' => $wins + $losses,
                'matches_won' => $wins,
                'sessions_active' => $sessionsActive,
            ],
            'primary_sport' => $primarySport ? [
                'id' => (int) $primarySport->id,
                'name' => (string) $primarySport->name,
                'slug' => (string) $primarySport->slug,
                'code' => (string) $primarySport->code,
            ] : null,
            'tier' => $tier,
            'total_point_balance' => $totalPointBalance,
            'highlights' => $highlights,
        ];
    }
}
