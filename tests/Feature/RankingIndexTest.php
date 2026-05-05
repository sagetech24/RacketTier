<?php

namespace Tests\Feature;

use App\Models\Ranking;
use App\Models\Sport;
use App\Models\TierRank;
use App\Models\User;
use App\Models\MemberPointWallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RankingIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_rankings_endpoint(): void
    {
        $response = $this->getJson('/auth/rankings');

        $response->assertUnauthorized();
    }

    public function test_rankings_endpoint_returns_sorted_rows(): void
    {
        $sport = Sport::query()->firstOrCreate([
            'slug' => 'pickleball',
        ], [
            'name' => 'Pickleball',
            'code' => 'PB',
            'icon' => 'sports_tennis',
        ]);

        $first = User::factory()->create(['name' => 'Alpha Player']);
        $second = User::factory()->create(['name' => 'Beta Player']);

        Ranking::query()->create([
            'user_id' => $first->id,
            'sport_id' => $sport->id,
            'rating' => 1100,
        ]);

        Ranking::query()->create([
            'user_id' => $second->id,
            'sport_id' => $sport->id,
            'rating' => 1250,
        ]);

        TierRank::query()->create([
            'sport_id' => $sport->id,
            'tier_no' => 1,
            'name' => 'Starter',
            'start_point' => 0,
            'end_point' => 99,
            'status' => true,
        ]);

        TierRank::query()->create([
            'sport_id' => $sport->id,
            'tier_no' => 2,
            'name' => 'Beginner',
            'start_point' => 100,
            'end_point' => 199,
            'status' => true,
        ]);

        MemberPointWallet::query()->create([
            'user_id' => $first->id,
            'sport_id' => $sport->id,
            'balance' => 25,
        ]);

        MemberPointWallet::query()->create([
            'user_id' => $second->id,
            'sport_id' => $sport->id,
            'balance' => 150,
        ]);

        $response = $this->actingAs($first)->getJson('/auth/rankings?sport_id='.$sport->id);

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.user.name', 'Beta Player');
        $response->assertJsonPath('data.0.rating', 1250);
        $response->assertJsonPath('data.0.rank', 1);
        $response->assertJsonPath('data.0.tier.name', 'Beginner');
        $response->assertJsonPath('data.1.user.name', 'Alpha Player');
        $response->assertJsonPath('data.1.rank', 2);
        $response->assertJsonPath('data.1.tier.name', 'Starter');
    }
}
