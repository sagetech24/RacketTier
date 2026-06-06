<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionStateReconcileTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_session_heals_stale_playing_flags_when_no_ongoing_match(): void
    {
        $host = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Stale Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'ongoing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1001,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 1,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $other->id,
            'queue_position' => 1002,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 2,
        ]);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions/'.$session->id);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.players.0.is_playing', false);
        $response->assertJsonPath('data.players.1.is_playing', false);

        $session->refresh();
        $this->assertSame('queueing', $session->status);
        $this->assertSame(0, GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->where('is_playing', true)
            ->count());
    }

    public function test_matches_index_heals_stale_playing_flags_when_no_ongoing_match(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Stale Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'ongoing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1001,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 1,
        ]);

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'finished',
            'lineup' => [],
            'finished_at' => now(),
        ]);

        $this->actingAs($host)->getJson('/auth/queueing-sessions/'.$session->id.'/matches')
            ->assertOk();

        $session->refresh();
        $this->assertSame('queueing', $session->status);
        $this->assertFalse(
            GameSessionPlayer::query()
                ->where('game_session_id', $session->id)
                ->where('is_playing', true)
                ->exists()
        );
    }

    public function test_reconcile_does_not_clear_players_during_real_ongoing_match(): void
    {
        $host = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Live Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'ongoing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $playerA = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 1,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $other->id,
            'queue_position' => 2,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 2,
        ]);

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'ongoing',
            'lineup' => [
                ['game_session_player_id' => $playerA->id, 'team' => 1],
            ],
            'started_at' => now(),
        ]);

        $this->actingAs($host)->getJson('/auth/game-sessions/'.$session->id)
            ->assertOk()
            ->assertJsonPath('data.status', 'ongoing');

        $playerA->refresh();
        $this->assertTrue($playerA->is_playing);
    }
}
