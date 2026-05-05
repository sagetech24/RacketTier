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
        $response->assertJsonPath('data.players.0.is_playing', false);
        $response->assertJsonPath('data.players.0.is_in_queue', true);
    }

    public function test_excludes_sessions_not_created_today_from_list(): void
    {
        $user = User::factory()->create();
        $peer = User::factory()->create();
        $stranger = User::factory()->create();
        $facility = Facility::query()->orderBy('id')->firstOrFail();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $oldSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $stranger->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'court_preference' => 'Court 1',
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $oldSession->id,
            'user_id' => $stranger->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        DB::table('game_sessions')->where('id', $oldSession->id)->update([
            'created_at' => now()->subDays(3),
        ]);

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
            'is_playing' => true,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/facilities/'.$facility->id.'/game-room');

        $response->assertOk();
        $response->assertJsonCount(1, 'data.sessions');
        $response->assertJsonCount(2, 'data.players');

        $payload = $response->json('data.players');
        $this->assertIsArray($payload);
        $this->assertSame([$peer->id, $user->id], array_column($payload, 'id'));
        $this->assertTrue(collect($payload)->firstWhere('id', $peer->id)['is_playing']);
        $this->assertTrue(collect($payload)->firstWhere('id', $user->id)['is_in_queue']);
        $this->assertFalse(collect($payload)->pluck('id')->contains($stranger->id));
    }

    public function test_players_list_includes_today_sessions_even_if_not_active(): void
    {
        $user = User::factory()->create();
        $inactivePlayer = User::factory()->create();
        $facility = Facility::query()->orderBy('id')->firstOrFail();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $activeSession = GameSession::query()->create([
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
            'game_session_id' => $activeSession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $inactiveSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $inactivePlayer->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => '1st-set',
            'court_preference' => 'Court 1',
            'started_at' => now(),
            'ended_at' => now(),
        ]);
        GameSessionPlayer::query()->create([
            'game_session_id' => $inactiveSession->id,
            'user_id' => $inactivePlayer->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/facilities/'.$facility->id.'/game-room');

        $response->assertOk();
        $response->assertJsonCount(1, 'data.sessions');
        $payload = $response->json('data.players');
        $this->assertIsArray($payload);
        $this->assertTrue(collect($payload)->pluck('id')->contains($user->id));
        $this->assertTrue(collect($payload)->pluck('id')->contains($inactivePlayer->id));
    }
}
