<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSessionStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_singles_session_with_one_invitee(): void
    {
        $creator = User::factory()->create();
        $peer = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/auth/game-sessions', [
            'facility_id' => 1,
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'court_preference' => 'Court 2',
            'player_ids' => [$peer->id],
            'team_assignments' => [
                ['user_id' => $creator->id, 'team' => 1],
                ['user_id' => $peer->id, 'team' => 2],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.match_type', 'singles');
        $response->assertJsonPath('data.game_type', '1st-set');
        $response->assertJsonPath('data.court_preference', 'Court 2');
        $response->assertJsonPath('data.facility.id', 1);

        $sessionId = $response->json('data.id');
        $this->assertNotNull($sessionId);

        $session = GameSession::query()->findOrFail($sessionId);
        $this->assertSame(1, $session->facility_id);
        $this->assertSame($creator->id, $session->created_by);
        $this->assertCount(2, $session->players);
    }

    public function test_doubles_rejects_fewer_than_three_invitees(): void
    {
        $creator = User::factory()->create();
        $a = User::factory()->create();
        $b = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/auth/game-sessions', [
            'facility_id' => 1,
            'sport_slug' => 'tennis',
            'match_type' => 'doubles',
            'game_type' => 'final-set',
            'court_preference' => null,
            'player_ids' => [$a->id, $b->id],
            'team_assignments' => [
                ['user_id' => $creator->id, 'team' => 1],
                ['user_id' => $a->id, 'team' => 1],
                ['user_id' => $b->id, 'team' => 2],
            ],
        ]);

        $response->assertUnprocessable();
    }

    public function test_authenticated_user_can_create_doubles_session_with_three_invitees(): void
    {
        $creator = User::factory()->create();
        $a = User::factory()->create();
        $b = User::factory()->create();
        $c = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/auth/game-sessions', [
            'facility_id' => 1,
            'sport_slug' => 'tennis',
            'match_type' => 'doubles',
            'game_type' => 'final-set',
            'court_preference' => null,
            'player_ids' => [$a->id, $b->id, $c->id],
            'team_assignments' => [
                ['user_id' => $creator->id, 'team' => 1],
                ['user_id' => $a->id, 'team' => 1],
                ['user_id' => $b->id, 'team' => 2],
                ['user_id' => $c->id, 'team' => 2],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonCount(4, 'data.players');
    }

    public function test_doubles_rejects_wrong_team_sizes(): void
    {
        $creator = User::factory()->create();
        $a = User::factory()->create();
        $b = User::factory()->create();
        $c = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/auth/game-sessions', [
            'facility_id' => 1,
            'sport_slug' => 'tennis',
            'match_type' => 'doubles',
            'game_type' => 'final-set',
            'court_preference' => null,
            'player_ids' => [$a->id, $b->id, $c->id],
            'team_assignments' => [
                ['user_id' => $creator->id, 'team' => 1],
                ['user_id' => $a->id, 'team' => 1],
                ['user_id' => $b->id, 'team' => 1],
                ['user_id' => $c->id, 'team' => 2],
            ],
        ]);

        $response->assertUnprocessable();
    }
}
