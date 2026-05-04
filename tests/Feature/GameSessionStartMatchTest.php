<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSessionStartMatchTest extends TestCase
{
    use RefreshDatabase;

    private function seedSinglesSession(User $host, User $guest, ?int $facilityId = null): GameSession
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

    public function test_host_can_start_singles_and_marks_two_players_playing(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match', [
            'facility_id' => 1,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'ongoing');
        $response->assertJsonPath('data.players.0.is_playing', true);
        $response->assertJsonPath('data.players.0.is_waiting', false);
        $response->assertJsonPath('data.players.1.is_playing', true);
        $response->assertJsonPath('data.players.1.is_waiting', false);
    }

    public function test_non_host_participant_receives_forbidden(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);

        $response = $this->actingAs($guest)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertForbidden();
    }

    public function test_start_fails_when_not_enough_waiting_players(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = GameSession::query()->create([
            'facility_id' => 1,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'court_preference' => null,
            'started_at' => now(),
        ]);
        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertUnprocessable();
    }

    public function test_start_fails_when_match_already_in_progress(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);
        GameSessionPlayer::query()->where('game_session_id', $session->id)->where('user_id', $host->id)->update([
            'is_playing' => true,
            'is_waiting' => false,
        ]);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertUnprocessable();
    }

    public function test_extra_waiting_players_get_queue_renumbered(): void
    {
        $host = User::factory()->create();
        $guestA = User::factory()->create();
        $guestB = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guestA, 1);
        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $guestB->id,
            'queue_position' => 3,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertOk();
        $response->assertJsonPath('data.players.2.user.id', $guestB->id);
        $response->assertJsonPath('data.players.2.is_playing', false);
        $response->assertJsonPath('data.players.2.is_waiting', true);
        $response->assertJsonPath('data.players.2.queue_position', 1);
    }

    public function test_doubles_requires_four_waiting_players(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'tennis')->firstOrFail();
        $session = GameSession::query()->create([
            'facility_id' => 1,
            'sport_id' => $sport->id,
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'game_type' => 'final-set',
            'court_preference' => null,
            'started_at' => now(),
        ]);
        $users = [$host, User::factory()->create(), User::factory()->create()];
        $pos = 1;
        foreach ($users as $u) {
            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $u->id,
                'queue_position' => $pos++,
                'is_waiting' => true,
                'is_playing' => false,
            ]);
        }

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertUnprocessable();
    }

    public function test_host_can_start_doubles_with_four_players(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'tennis')->firstOrFail();
        $session = GameSession::query()->create([
            'facility_id' => 1,
            'sport_id' => $sport->id,
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'game_type' => 'final-set',
            'court_preference' => null,
            'started_at' => now(),
        ]);
        $users = [
            $host,
            User::factory()->create(),
            User::factory()->create(),
            User::factory()->create(),
        ];
        $pos = 1;
        foreach ($users as $u) {
            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $u->id,
                'queue_position' => $pos++,
                'is_waiting' => true,
                'is_playing' => false,
            ]);
        }

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match');

        $response->assertOk();
        $response->assertJsonPath('data.status', 'ongoing');
        $response->assertJsonCount(4, 'data.players');
        foreach (range(0, 3) as $i) {
            $response->assertJsonPath("data.players.{$i}.is_playing", true);
            $response->assertJsonPath("data.players.{$i}.is_waiting", false);
        }
    }

    public function test_facility_id_body_must_match_session(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match', [
            'facility_id' => 2,
        ]);

        $response->assertUnprocessable();
    }
}
