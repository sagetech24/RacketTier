<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\QueueingSessionMatch;
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
            'skip_scores' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.queue_name', 'Updated Queue');
        $response->assertJsonPath('data.skip_scores', true);
        $response->assertJsonPath('data.can_edit_match_type', true);

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
        $response->assertJsonPath('data.auto_match_criteria.skill_level', true);
        $response->assertJsonPath('data.optional_guest_skill', false);
        $players = collect($response->json('data.players'));
        $this->assertCount(1, $players);
        $this->assertSame($member->id, $players->first()['user']['id']);

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $show->assertJsonPath('data.auto_match_criteria.skill_level', true);
        $this->assertCount(1, $show->json('data.players'));
    }

    public function test_queue_master_can_change_match_type_before_first_match(): void
    {
        $host = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Wrong Format',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');
        $create->assertJsonPath('data.can_edit_match_type', true);

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$sessionId, [
            'queue_name' => 'Wrong Format',
            'match_type' => 'doubles',
            'win_points' => 30,
            'loss_points' => 8,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.match_type', 'doubles');
        $response->assertJsonPath('data.can_edit_match_type', true);

        $this->assertSame('doubles', GameSession::query()->findOrFail($sessionId)->match_type);
    }

    public function test_queue_master_cannot_change_match_type_after_a_match_exists(): void
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Locked Format',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $host->id,
        ])->assertOk();
        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $opponent->id,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => [
                ['id' => $hostPlayerId, 'team' => 1],
                ['id' => $opponentPlayerId, 'team' => 2],
            ],
        ])->assertCreated();

        $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)
            ->assertOk()
            ->assertJsonPath('data.can_edit_match_type', false);

        $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$sessionId, [
            'queue_name' => 'Locked Format',
            'match_type' => 'doubles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['match_type']);

        $this->assertSame('singles', GameSession::query()->findOrFail($sessionId)->match_type);
    }

    public function test_queue_master_can_update_other_settings_after_a_match_exists(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Has Match',
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

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'queueing',
            'lineup' => [],
        ]);

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Renamed After Match',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.queue_name', 'Renamed After Match');
        $response->assertJsonPath('data.match_type', 'singles');
        $response->assertJsonPath('data.can_edit_match_type', false);
    }
}
