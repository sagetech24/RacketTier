<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSessionFinishMatchTest extends TestCase
{
    use RefreshDatabase;

    private function seedSinglesSession(User $host, User $guest, ?int $facilityId = null): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $facility = $facilityId !== null
            ? \App\Models\Facility::query()->whereKey($facilityId)->firstOrFail()
            : \App\Models\Facility::query()->orderBy('id')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => $facility->id,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
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

    public function test_host_can_finish_singles_match_and_returns_to_queueing(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);

        $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match', [
            'facility_id' => 1,
        ])->assertOk();

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'facility_id' => 1,
            'team1_score' => 21,
            'team2_score' => 15,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.last_match.team1_score', 21);
        $response->assertJsonPath('data.last_match.team2_score', 15);
        $response->assertJsonPath('data.last_match.winning_team', 1);
        $response->assertJsonPath('data.players.0.is_playing', false);
        $response->assertJsonPath('data.players.0.is_waiting', true);

        $this->assertSame(1, RatingHistory::query()->where('user_id', $host->id)->count());
        $this->assertSame(1, Ranking::query()->where('user_id', $host->id)->where('sport_id', $session->sport_id)->count());
    }

    public function test_finish_rejects_tied_scores(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);
        $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match', [
            'facility_id' => 1,
        ])->assertOk();

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'facility_id' => 1,
            'team1_score' => 20,
            'team2_score' => 20,
        ]);

        $response->assertUnprocessable();
    }

    public function test_non_host_cannot_finish(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);
        $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match', [
            'facility_id' => 1,
        ])->assertOk();

        $response = $this->actingAs($guest)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'facility_id' => 1,
            'team1_score' => 21,
            'team2_score' => 19,
        ]);

        $response->assertForbidden();
    }

    public function test_finish_fails_when_not_ongoing(): void
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();
        $session = $this->seedSinglesSession($host, $guest, 1);

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'facility_id' => 1,
            'team1_score' => 21,
            'team2_score' => 19,
        ]);

        $response->assertUnprocessable();
    }

    public function test_host_can_finish_doubles_when_teams_assigned(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'tennis')->firstOrFail();
        $session = GameSession::query()->create([
            'facility_id' => 1,
            'sport_id' => $sport->id,
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
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
        $teams = [1, 1, 2, 2];
        $pos = 1;
        foreach ($users as $i => $u) {
            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $u->id,
                'queue_position' => $pos++,
                'is_waiting' => true,
                'is_playing' => false,
                'team' => $teams[$i],
            ]);
        }

        $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/start-match')->assertOk();

        $response = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'facility_id' => 1,
            'team1_score' => 6,
            'team2_score' => 4,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.last_match.winning_team', 1);
        $this->assertSame(4, RatingHistory::query()->where('game_session_id', $session->id)->count());
    }
}
