<?php

namespace App\Actions;

use App\Models\Sport;
use App\Models\TierRank;
use Illuminate\Support\Collection;

class ListAdminTierRanks
{
    /**
     * @return array{
     *   sports: list<array{id: int, name: string}>,
     *   tiers: list<array<string, mixed>>
     * }
     */
    public function execute(?int $sportId = null): array
    {
        $sports = Sport::query()
            ->orderBy('id')
            ->get(['id', 'name'])
            ->map(fn (Sport $sport): array => [
                'id' => (int) $sport->id,
                'name' => (string) $sport->name,
            ])
            ->all();

        $query = TierRank::query()
            ->with('sport:id,name')
            ->orderBy('sport_id')
            ->orderBy('tier_no');

        if ($sportId !== null) {
            $query->where('sport_id', $sportId);
        }

        /** @var Collection<int, TierRank> $tiers */
        $tiers = $query->get();

        return [
            'sports' => $sports,
            'tiers' => $tiers->map(fn (TierRank $tier): array => [
                'id' => (int) $tier->id,
                'sport_id' => (int) $tier->sport_id,
                'sport_name' => $tier->sport?->name,
                'tier_no' => (int) $tier->tier_no,
                'name' => (string) $tier->name,
                'start_point' => (int) $tier->start_point,
                'end_point' => (int) $tier->end_point,
                'status' => (bool) $tier->status,
            ])->all(),
        ];
    }
}
