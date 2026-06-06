<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingGameSessionEndTest extends TestCase
{
    use RefreshDatabase;

    private function makeActiveQueueingSession(User $host, Sport $sport, string $status = 'queueing'): GameSession
    {
        return GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Test Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => $status,
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);
    }

    public function test_queue_master_cannot_end_session_while_match_is_ongoing(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeActiveQueueingSession($host, $sport, 'ongoing');

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'ongoing',
            'lineup' => [],
            'started_at' => now(),
        ]);

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$session->id.'/end')
            ->assertStatus(422);

        $session->refresh();
        $this->assertTrue($session->is_active);
    }

    public function test_admin_can_force_end_session_with_ongoing_match(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeActiveQueueingSession($host, $sport, 'ongoing');

        $player = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => true,
            'team' => 1,
        ]);

        $ongoingMatch = QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'ongoing',
            'lineup' => [['game_session_player_id' => $player->id, 'team' => 1]],
            'started_at' => now(),
        ]);

        $queuedMatch = QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 2,
            'status' => 'queueing',
            'lineup' => [],
        ]);

        $this->actingAs($admin)
            ->postJson('/auth/queueing-sessions/'.$session->id.'/end')
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.status', 'finished');

        $session->refresh();
        $player->refresh();

        $this->assertFalse($session->is_active);
        $this->assertSame('finished', $session->status);
        $this->assertNotNull($session->ended_at);
        $this->assertFalse($player->is_playing);
        $this->assertFalse($player->is_waiting);
        $this->assertNull($player->team);
        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $ongoingMatch->id]);
        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $queuedMatch->id]);
    }

    public function test_queue_master_can_end_session_when_no_match_is_ongoing(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeActiveQueueingSession($host, $sport, 'queueing');

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$session->id.'/end')
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $session->refresh();
        $this->assertFalse($session->is_active);
    }

    public function test_queue_master_can_end_session_with_stale_ongoing_status_and_no_ongoing_match(): void
    {
        $host = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeActiveQueueingSession($host, $sport, 'ongoing');

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

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'finished',
            'lineup' => [],
            'finished_at' => now(),
        ]);

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$session->id.'/end')
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.status', 'finished');

        $session->refresh();
        $this->assertFalse($session->is_active);
        $this->assertSame(0, GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->where('is_playing', true)
            ->count());
    }
}
