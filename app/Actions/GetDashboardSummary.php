<?php

namespace App\Actions;

use App\Models\User;

class GetDashboardSummary
{
    /**
     * @return array{
     *   user: array{id: int, name: string, email: string, member_since: string|null},
     *   stats: array{
     *     rating: int,
     *     matches_played: int,
     *     matches_won: int,
     *     sessions_active: int
     *   },
     *   highlights: array<int, array{title: string, meta: string}>
     * }
     */
    public function execute(User $user): array
    {
        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'member_since' => $user->created_at?->toIso8601String(),
            ],
            'stats' => [
                'rating' => 1000,
                'matches_played' => 0,
                'matches_won' => 0,
                'sessions_active' => 0,
            ],
            'highlights' => [],
        ];
    }
}
