<?php

namespace Database\Seeders;

use App\Models\Sport;
use App\Models\TierRank;
use Illuminate\Database\Seeder;

class TierRankSeeder extends Seeder
{
    /**
     * Point brackets are per sport; tier_no 1–5 maps to product tier names.
     * Top bracket uses a large end_point for open-ended "9999+" style caps.
     */
    public function run(): void
    {
        $brackets = [
            ['tier_no' => 1, 'name' => 'Starter', 'start_point' => 0, 'end_point' => 2000],
            ['tier_no' => 2, 'name' => 'Beginner', 'start_point' => 2001, 'end_point' => 4000],
            ['tier_no' => 3, 'name' => 'Intermediate', 'start_point' => 4001, 'end_point' => 6000],
            ['tier_no' => 4, 'name' => 'Sempai', 'start_point' => 6001, 'end_point' => 8000],
            ['tier_no' => 5, 'name' => 'Sensie', 'start_point' => 8001, 'end_point' => 9_999_999],
        ];

        foreach (Sport::query()->orderBy('id')->get() as $sport) {
            foreach ($brackets as $b) {
                TierRank::query()->updateOrCreate(
                    [
                        'sport_id' => $sport->id,
                        'tier_no' => $b['tier_no'],
                    ],
                    [
                        'name' => $b['name'],
                        'start_point' => $b['start_point'],
                        'end_point' => $b['end_point'],
                        'status' => true,
                    ],
                );
            }
        }
    }
}
