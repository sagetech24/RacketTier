<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSessionReadTest extends TestCase
{
    use RefreshDatabase;

    private function seedSessionWithPlayers(User $host, User $guest, ?int $facilityId = null): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $facility = $facilityId !== null
            ? Facility::query()->whereKey($facilityId)->firstOrFail()
            : Facility::query()->orderBy('id')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'court_preference' => 'Court 1',
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $guest->id,
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        return $session;
    }

    public function test_index_lists_active_sessions_for_participant(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSessionWithPlayers($host, $guest);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $session->id);
        $response->assertJsonPath('data.0.is_host', true);
    }

    public function test_show_returns_session_for_invited_player(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSessionWithPlayers($host, $guest);

        $response = $this->actingAs($guest)->getJson('/auth/game-sessions/'.$session->id);

        $response->assertOk();
        $response->assertJsonPath('data.id', $session->id);
        $response->assertJsonPath('data.is_host', false);
        $response->assertJsonCount(2, 'data.players');
    }

    public function test_show_returns_404_for_non_participant(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $stranger = User::factory()->create();
        $session = $this->seedSessionWithPlayers($host, $guest);

        $response = $this->actingAs($stranger)->getJson('/auth/game-sessions/'.$session->id);

        $response->assertNotFound();
    }

    public function test_index_filters_by_facility_id(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $sessionFacility1 = $this->seedSessionWithPlayers($host, $guest, 1);
        $this->seedSessionWithPlayers($host, $guest, 2);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions?facility_id=1');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $sessionFacility1->id);
    }

    public function test_show_returns_404_when_facility_id_query_mismatch(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSessionWithPlayers($host, $guest, 1);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions/'.$session->id.'?facility_id=2');

        $response->assertNotFound();
    }

    public function test_show_ok_when_facility_id_query_matches(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSessionWithPlayers($host, $guest, 1);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions/'.$session->id.'?facility_id=1');

        $response->assertOk();
        $response->assertJsonPath('data.id', $session->id);
    }
}
