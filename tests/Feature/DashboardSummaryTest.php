<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_primary_sport_is_most_played_not_most_recent(): void
    {
        $user = User::factory()->create();
        $badminton = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $tennis = Sport::query()->where('slug', 'tennis')->firstOrFail();
        $facility = Facility::query()->orderBy('id')->firstOrFail();

        $tennisSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'session_context' => 'facility',
            'sport_id' => $tennis->id,
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'last_finished_at' => now()->subDays(3),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $tennisSession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 5,
            'losses_count' => 2,
        ]);

        $badmintonSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'session_context' => 'facility',
            'sport_id' => $badminton->id,
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'last_finished_at' => now()->subDay(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $badmintonSession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 1,
            'losses_count' => 0,
        ]);

        $response = $this->actingAs($user)->getJson(route('auth.dashboard-summary'));

        $response->assertOk();
        $response->assertJsonPath('primary_sport.slug', 'tennis');
        $response->assertJsonPath('primary_sport.name', $tennis->name);
    }

    public function test_primary_sport_is_null_when_user_has_no_recorded_matches(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson(route('auth.dashboard-summary'));

        $response->assertOk();
        $response->assertJsonPath('primary_sport', null);
    }
}
