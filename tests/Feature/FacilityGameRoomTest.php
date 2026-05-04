<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityGameRoomTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_sessions_and_roster_for_facility(): void
    {
        $user = User::factory()->create();
        $peer = User::factory()->create();
        $facility = Facility::query()->orderBy('id')->firstOrFail();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
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
            'game_session_id' => $session->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $peer->id,
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/facilities/'.$facility->id.'/game-room');

        $response->assertOk();
        $response->assertJsonPath('data.facility.id', $facility->id);
        $response->assertJsonCount(1, 'data.sessions');
        $response->assertJsonCount(2, 'data.players');
    }
}
