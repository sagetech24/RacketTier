<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingGameSessionUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_master_can_update_active_queueing_session(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Old Name',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'skip_scores' => false,
            'started_at' => now(),
        ]);

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Updated Queue',
            'win_points' => 40,
            'loss_points' => 10,
            'skip_scores' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.queue_name', 'Updated Queue');
        $response->assertJsonPath('data.win_points', 40);
        $response->assertJsonPath('data.loss_points', 10);
        $response->assertJsonPath('data.skip_scores', true);

        $session->refresh();
        $this->assertSame('Updated Queue', $session->queue_name);
        $this->assertTrue($session->skip_scores);
    }

    public function test_queue_master_can_update_auto_match_criteria(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Criteria Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'auto_match_criteria' => [
                'skill_level' => true,
                'skill_match_mode' => 'balanced',
                'wl_statistics' => true,
                'sequence' => true,
                'genderless_mixed' => true,
            ],
            'started_at' => now(),
        ]);

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Criteria Queue',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => true,
            'skill_match_mode' => 'same_level',
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.auto_match_criteria.skill_match_mode', 'same_level');
        $response->assertJsonPath('data.auto_match_criteria.wl_statistics', false);

        $session->refresh();
        $this->assertSame('same_level', $session->auto_match_criteria['skill_match_mode']);
        $this->assertFalse($session->auto_match_criteria['wl_statistics']);
    }

    public function test_admin_can_update_active_queueing_session(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
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

        $response = $this->actingAs($admin)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Admin Updated',
            'win_points' => 50,
            'loss_points' => 12,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.queue_name', 'Admin Updated');
        $response->assertJsonPath('data.can_manage', true);
        $response->assertJsonPath('data.is_host', false);
    }

    public function test_non_host_cannot_update_queueing_session(): void
    {
        $host = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
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

        $this->actingAs($other)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Hijacked',
            'win_points' => 1,
            'loss_points' => 1,
        ])->assertForbidden();
    }

    public function test_queue_master_can_update_draft_session_settings_and_roster_is_preserved(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Draft Queue',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => false,
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
            'skill_level' => null,
        ])->assertOk();

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$sessionId, [
            'queue_name' => 'Updated Draft Queue',
            'win_points' => 40,
            'loss_points' => 12,
            'skip_scores' => true,
            'optional_guest_skill' => false,
            'optional_guest_gender' => true,
            'skill_level' => true,
            'skill_match_mode' => 'balanced',
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.queue_name', 'Updated Draft Queue');
        $response->assertJsonPath('data.win_points', 40);
        $response->assertJsonPath('data.auto_match_criteria.skill_level', true);
        $response->assertJsonPath('data.optional_guest_skill', false);
        $players = collect($response->json('data.players'));
        $this->assertCount(1, $players);
        $this->assertSame($member->id, $players->first()['user']['id']);

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $show->assertJsonPath('data.auto_match_criteria.skill_level', true);
        $this->assertCount(1, $show->json('data.players'));
    }
}
