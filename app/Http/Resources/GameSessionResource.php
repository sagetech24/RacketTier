<?php

namespace App\Http\Resources;

use App\Models\GameSession;
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
            ],
            'match_type' => $this->match_type,
            'game_type' => $this->game_type,
            'court_preference' => $this->court_preference,
            'is_active' => $this->is_active,
            'status' => $this->status,
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'is_host' => $user !== null && (int) $this->created_by === (int) $user->id,
            'created_by' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
                'email' => $this->creator?->email,
            ]),
            'participant_count' => $this->whenCounted('players'),
            'players' => $this->whenLoaded('players', function () {
                return $this->players->sortBy([
                    ['is_playing', 'desc'],
                    ['queue_position', 'asc'],
                ])->values()->map(fn ($p): array => [
                    'id' => $p->id,
                    'queue_position' => $p->queue_position,
                    'is_waiting' => $p->is_waiting,
                    'is_playing' => $p->is_playing,
                    'team' => $p->team,
                    'user' => [
                        'id' => $p->user?->id,
                        'name' => $p->user?->name,
                        'email' => $p->user?->email,
                    ],
                ]);
            }),
        ];
    }
}
