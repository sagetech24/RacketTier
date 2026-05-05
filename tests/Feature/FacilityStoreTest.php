<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FacilityStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_facility(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/facilities', [
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'Riverside Courts');

        $this->assertDatabaseHas('facilities', [
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
            'created_by' => $user->id,
        ]);
    }

    public function test_cannot_create_duplicate_facility_by_name_and_address(): void
    {
        $user = User::factory()->create();

        Facility::query()->create([
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/auth/facilities', [
            'name' => '  riverside   courts  ',
            'address' => '  123 river rd, cebu city  ',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
        $this->assertSame(
            'A facility with this name and address already exists.',
            $response->json('errors.name.0')
        );

        $this->assertDatabaseCount('facilities', 3);
    }

    public function test_facility_index_supports_search(): void
    {
        Facility::query()->create([
            'name' => 'Alpha Dome',
            'address' => 'North district',
            'created_by' => null,
        ]);
        Facility::query()->create([
            'name' => 'Beta Hall',
            'address' => 'South district',
            'created_by' => null,
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/facilities?q=Alpha');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Alpha Dome');
    }

    public function test_authenticated_user_can_update_facility(): void
    {
        $user = User::factory()->create();
        $facility = Facility::query()->create([
            'name' => 'Old Courts',
            'address' => 'Old address',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->patchJson('/auth/facilities/'.$facility->id, [
            'name' => 'Updated Courts',
            'address' => 'Updated address',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Updated Courts');
        $response->assertJsonPath('data.address', 'Updated address');

        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'name' => 'Updated Courts',
            'address' => 'Updated address',
        ]);
    }

    public function test_cannot_update_facility_to_duplicate_name_and_address(): void
    {
        $user = User::factory()->create();
        $existing = Facility::query()->create([
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
            'created_by' => $user->id,
        ]);
        $editing = Facility::query()->create([
            'name' => 'Metro Sports Club',
            'address' => 'Lahug, Cebu City',
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->patchJson('/auth/facilities/'.$editing->id, [
            'name' => '  riverside   courts  ',
            'address' => '  123 river rd, cebu city  ',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
        $this->assertSame(
            'A facility with this name and address already exists.',
            $response->json('errors.name.0')
        );

        $this->assertDatabaseHas('facilities', [
            'id' => $existing->id,
            'name' => 'Riverside Courts',
            'address' => '123 River Rd, Cebu City',
        ]);
        $this->assertDatabaseHas('facilities', [
            'id' => $editing->id,
            'name' => 'Metro Sports Club',
            'address' => 'Lahug, Cebu City',
        ]);
    }

    public function test_facility_index_includes_today_checked_in_players_count(): void
    {
        $user = User::factory()->create();
        $peer = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $facility = Facility::query()->create([
            'name' => 'Gamma Courts',
            'address' => 'Central district',
            'created_by' => $user->id,
        ]);

        $todaySession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $user->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'court_preference' => 'Court 1',
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $todaySession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);
        GameSessionPlayer::query()->create([
            'game_session_id' => $todaySession->id,
            'user_id' => $peer->id,
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $oldSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $peer->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'court_preference' => 'Court 2',
            'started_at' => now()->subDay(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $oldSession->id,
            'user_id' => $peer->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        DB::table('game_sessions')->where('id', $oldSession->id)->update([
            'created_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($user)->getJson('/auth/facilities?q=Gamma');

        $response->assertOk();
        $response->assertJsonPath('data.0.today_checked_in_players_count', 2);
    }
}
