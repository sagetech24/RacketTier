<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingGameSessionAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_all_active_queueing_sessions(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $visible = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Host Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $hiddenFromHost = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Other Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => User::factory()->create()->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $adminResponse = $this->actingAs($admin)->getJson('/auth/game-sessions?session_context=queueing');
        $adminResponse->assertOk();
        $adminIds = collect($adminResponse->json('data'))->pluck('id')->all();
        $this->assertContains($visible->id, $adminIds);
        $this->assertContains($hiddenFromHost->id, $adminIds);
        $adminResponse->assertJsonPath('data.0.can_manage', true);
        $adminResponse->assertJsonPath('data.0.can_delete', true);

        $hostResponse = $this->actingAs($host)->getJson('/auth/game-sessions?session_context=queueing');
        $hostResponse->assertOk();
        $hostIds = collect($hostResponse->json('data'))->pluck('id')->all();
        $this->assertContains($visible->id, $hostIds);
        $this->assertNotContains($hiddenFromHost->id, $hostIds);
    }

    public function test_admin_can_delete_queueing_session_and_cascade_children(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Delete Me',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $player = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $match = QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'queueing',
            'lineup' => [['game_session_player_id' => $player->id, 'team' => 1]],
        ]);

        $this->actingAs($admin)
            ->deleteJson('/auth/queueing-sessions/'.$session->id)
            ->assertOk();

        $this->assertDatabaseMissing('game_sessions', ['id' => $session->id]);
        $this->assertDatabaseMissing('game_session_players', ['id' => $player->id]);
        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $match->id]);
    }

    public function test_non_manager_cannot_delete_queueing_session(): void
    {
        $host = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Protected Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $this->actingAs($other)
            ->deleteJson('/auth/queueing-sessions/'.$session->id)
            ->assertForbidden();

        $this->assertDatabaseHas('game_sessions', ['id' => $session->id]);
    }

    public function test_admin_can_update_finished_queueing_session(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Finished Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now()->subHour(),
            'ended_at' => now(),
        ]);

        $this->actingAs($admin)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Admin Fixed Name',
            'win_points' => 25,
            'loss_points' => 5,
        ])->assertOk()
            ->assertJsonPath('data.queue_name', 'Admin Fixed Name');

        $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Host Attempt',
            'win_points' => 1,
            'loss_points' => 1,
        ])->assertStatus(422);
    }

    public function test_admin_sees_all_finished_queueing_sessions_in_history(): void
    {
        $admin = User::factory()->admin()->create();
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $strangerSession = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Stranger Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($admin)->getJson('/auth/queueing-sessions/history');
        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($strangerSession->id, $ids);
        $response->assertJsonPath('data.0.can_delete', true);
    }

    public function test_admin_can_delete_finished_queueing_session_and_cascade_children(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Finished Delete Me',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
        ]);

        $player = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $match = QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'finished',
            'lineup' => [['game_session_player_id' => $player->id, 'team' => 1]],
            'finished_at' => now()->subHour(),
        ]);

        $this->actingAs($admin)
            ->deleteJson('/auth/queueing-sessions/'.$session->id)
            ->assertOk();

        $this->assertDatabaseMissing('game_sessions', ['id' => $session->id]);
        $this->assertDatabaseMissing('game_session_players', ['id' => $player->id]);
        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $match->id]);
    }

    public function test_queue_master_cannot_delete_finished_queueing_session(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Finished Host Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
        ]);

        $this->actingAs($host)
            ->deleteJson('/auth/queueing-sessions/'.$session->id)
            ->assertForbidden();

        $this->assertDatabaseHas('game_sessions', ['id' => $session->id]);
    }
}
