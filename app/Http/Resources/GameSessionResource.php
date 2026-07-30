<?php

namespace App\Http\Resources;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\TierRank;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GameSession
 */
class GameSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        $eloByUser = [];
        $walletBalanceByUser = [];
        $tierRowsForSport = collect();

        $enrichment = $this->getAttribute('player_enrichment');
        if (is_array($enrichment)) {
            $eloByUser = $enrichment['eloByUser'] ?? [];
            $walletBalanceByUser = $enrichment['walletBalanceByUser'] ?? [];
            $tierRowsForSport = $enrichment['tierRowsForSport'] ?? collect();
        } elseif ($this->relationLoaded('players') && $this->sport_id) {
            $uids = $this->players->pluck('user_id')->unique()->filter()->values()->all();
            if ($uids !== []) {
                $sportId = (int) $this->sport_id;
                $eloByUser = Ranking::query()
                    ->where('sport_id', $sportId)
                    ->whereIn('user_id', $uids)
                    ->pluck('rating', 'user_id')
                    ->all();

                $walletBalanceByUser = MemberPointWallet::query()
                    ->where('sport_id', $sportId)
                    ->whereIn('user_id', $uids)
                    ->pluck('balance', 'user_id')
                    ->all();

                $tierRowsForSport = TierRank::query()
                    ->where('sport_id', $sportId)
                    ->where('status', true)
                    ->orderBy('tier_no')
                    ->get();
            }
        }

        return [
            'id' => $this->id,
            'session_context' => $this->session_context ?? 'facility',
            'queue_name' => $this->queue_name,
            'win_points' => $this->win_points !== null ? (int) $this->win_points : null,
            'loss_points' => $this->loss_points !== null ? (int) $this->loss_points : null,
            'skip_scores' => (bool) ($this->skip_scores ?? false),
            'optional_guest_skill' => (bool) ($this->optional_guest_skill ?? true),
            'optional_guest_gender' => (bool) ($this->optional_guest_gender ?? true),
            'auto_match_criteria' => $this->when(
                $this->isQueueing(),
                fn (): array => $this->resolveAutoMatchCriteria()->toStoredArray(),
            ),
            'completed_matches_count' => (int) ($this->completed_matches_count ?? 0),
            'persistence_state' => $this->persistence_state ?? 'persisted',
            'draft_version' => (int) ($this->draft_version ?? 0),
            'facility' => $this->when(
                $this->relationLoaded('facility') && $this->facility_id !== null,
                fn (): array => [
                    'id' => $this->facility?->id,
                    'name' => $this->facility?->name,
                    'address' => $this->facility?->address,
                ],
            ),
            'sport' => [
                'id' => $this->sport?->id,
                'slug' => $this->sport?->slug,
                'name' => $this->sport?->name,
                'code' => $this->sport?->code,
                'icon' => $this->sport?->icon,
            ],
            'match_type' => $this->match_type,
            'game_type' => $this->game_type,
            'court_preference' => $this->court_preference,
            'is_active' => $this->is_active,
            'status' => $this->status,
            'last_match' => $this->when(
                $this->last_winning_team !== null
                    || ($this->last_team1_score !== null && $this->last_team2_score !== null),
                fn (): array => [
                    'team1_score' => $this->last_team1_score !== null ? (int) $this->last_team1_score : null,
                    'team2_score' => $this->last_team2_score !== null ? (int) $this->last_team2_score : null,
                    'winning_team' => $this->last_winning_team !== null ? (int) $this->last_winning_team : null,
                    'finished_at' => $this->last_finished_at?->toIso8601String(),
                    'players' => is_array($this->last_result_breakdown)
                        ? ($this->last_result_breakdown['players'] ?? [])
                        : [],
                ],
            ),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'is_host' => $user !== null && (int) $this->created_by === (int) $user->id,
            'can_manage' => $user !== null && $this->userCanManage($user),
            'can_delete' => $user !== null && $this->userCanDelete($user),
            'created_by' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
                'email' => $this->creator?->email,
            ]),
            'participant_count' => $this->when(
                isset($this->players_count) || $this->relationLoaded('players'),
                fn (): int => (int) ($this->players_count ?? $this->players->count()),
            ),
            'players' => $this->whenLoaded('players', function () use ($eloByUser, $walletBalanceByUser, $tierRowsForSport) {
                return $this->players->sortBy([
                    ['is_playing', 'desc'],
                    ['queue_position', 'asc'],
                ])->values()->map(function ($p) use ($eloByUser, $walletBalanceByUser, $tierRowsForSport): array {
                    /** @var GameSessionPlayer $p */
                    $uid = $p->user_id !== null ? (int) $p->user_id : null;
                    $isGuest = $p->isGuest();

                    $tier = null;
                    if (! $isGuest && $uid !== null && $tierRowsForSport->isNotEmpty()) {
                        $balance = (int) ($walletBalanceByUser[$uid] ?? 0);
                        $tierRow = $tierRowsForSport->first(
                            fn (TierRank $row): bool => $row->start_point <= $balance && $row->end_point >= $balance
                        );
                        if ($tierRow !== null) {
                            $tier = [
                                'id' => (int) $tierRow->id,
                                'tier_no' => (int) $tierRow->tier_no,
                                'name' => (string) $tierRow->name,
                            ];
                        }
                    }

                    return [
                        'id' => $p->id,
                        'queue_position' => $p->queue_position,
                        'is_waiting' => $p->is_waiting,
                        'is_playing' => $p->is_playing,
                        'is_removed' => (bool) ($p->getAttribute('is_removed') ?? false),
                        'team' => $p->team,
                        'wins_count' => (int) ($p->wins_count ?? 0),
                        'losses_count' => (int) ($p->losses_count ?? 0),
                        'session_points' => (int) ($p->session_points ?? 0),
                        'elo_rating' => $isGuest || $uid === null ? null : (int) ($eloByUser[$uid] ?? 1000),
                        'tier' => $tier,
                        'is_guest' => $isGuest,
                        'guest_name' => $p->guest_name,
                        'pronoun' => $p->pronoun,
                        'skill_level' => $p->skill_level !== null ? (int) $p->skill_level : null,
                        'user' => $isGuest
                            ? null
                            : [
                                'id' => $p->user?->id,
                                'name' => $p->user?->name,
                                'email' => $p->user?->email,
                            ],
                    ];
                });
            }),
        ];
    }
}
