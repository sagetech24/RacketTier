<?php

namespace App\Http\Resources;

use App\Models\GameSession;
use App\Models\Ranking;
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
        if ($this->relationLoaded('players') && $this->sport_id) {
            $uids = $this->players->pluck('user_id')->unique()->filter()->values()->all();
            if ($uids !== []) {
                $eloByUser = Ranking::query()
                    ->where('sport_id', (int) $this->sport_id)
                    ->whereIn('user_id', $uids)
                    ->pluck('rating', 'user_id')
                    ->all();
            }
        }

        return [
            'id' => $this->id,
            'facility' => $this->whenLoaded('facility', fn (): array => [
                'id' => $this->facility?->id,
                'name' => $this->facility?->name,
                'address' => $this->facility?->address,
            ]),
            'sport' => [
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
                $this->last_team1_score !== null && $this->last_team2_score !== null,
                fn (): array => [
                    'team1_score' => (int) $this->last_team1_score,
                    'team2_score' => (int) $this->last_team2_score,
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
            'created_by' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
                'email' => $this->creator?->email,
            ]),
            'participant_count' => $this->whenCounted('players'),
            'players' => $this->whenLoaded('players', function () use ($eloByUser) {
                return $this->players->sortBy([
                    ['is_playing', 'desc'],
                    ['queue_position', 'asc'],
                ])->values()->map(function ($p) use ($eloByUser): array {
                    $uid = (int) ($p->user?->id ?? 0);

                    return [
                        'id' => $p->id,
                        'queue_position' => $p->queue_position,
                        'is_waiting' => $p->is_waiting,
                        'is_playing' => $p->is_playing,
                        'team' => $p->team,
                        'wins_count' => (int) ($p->wins_count ?? 0),
                        'losses_count' => (int) ($p->losses_count ?? 0),
                        'session_points' => (int) ($p->session_points ?? 0),
                        'elo_rating' => $uid > 0 ? (int) ($eloByUser[$uid] ?? 1000) : 1000,
                        'user' => [
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
