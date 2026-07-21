<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingGameSessionStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_queueing_session(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Friday Night Smash',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.session_context', 'queueing');
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.queue_name', 'Friday Night Smash');
        $response->assertJsonPath('data.win_points', 30);
        $response->assertJsonPath('data.loss_points', 8);

        $id = $response->json('data.id');
        $this->assertNotNull($id);
        $session = GameSession::query()->findOrFail($id);
        $this->assertTrue($session->isQueueing());
        $this->assertTrue($session->isDraft());
        $this->assertNull($session->facility_id);
        $this->assertSame('Friday Night Smash', $session->queue_name);
        $this->assertFalse($session->skip_scores);
        $this->assertTrue($session->optional_guest_skill);
        $this->assertTrue($session->optional_guest_gender);
        $this->assertSame([
            'skill_level' => true,
            'skill_match_mode' => 'balanced',
            'wl_statistics' => true,
            'sequence' => true,
            'genderless_mixed' => true,
        ], $session->auto_match_criteria);
        $response->assertJsonPath('data.auto_match_criteria.skill_level', true);
        $response->assertJsonPath('data.optional_guest_skill', true);
        $response->assertJsonPath('data.optional_guest_gender', true);
    }

    public function test_create_queueing_session_can_set_auto_match_criteria(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Skill Queue',
            'sport_slug' => 'badminton',
            'match_type' => 'doubles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => true,
            'skill_match_mode' => 'same_level',
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => false,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.auto_match_criteria.skill_match_mode', 'same_level');
        $response->assertJsonPath('data.auto_match_criteria.wl_statistics', false);

        $session = GameSession::query()->findOrFail($response->json('data.id'));
        $this->assertSame('same_level', $session->auto_match_criteria['skill_match_mode']);
        $this->assertFalse($session->auto_match_criteria['wl_statistics']);
    }

    public function test_create_queueing_session_rejects_empty_auto_match_criteria(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Invalid Criteria',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => false,
            'wl_statistics' => false,
            'sequence' => false,
            'genderless_mixed' => false,
        ])->assertUnprocessable();
    }

    public function test_create_queueing_session_can_enable_skip_scores(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Quick Wins',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skip_scores' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.skip_scores', true);

        $session = GameSession::query()->findOrFail($response->json('data.id'));
        $this->assertTrue($session->skip_scores);
    }
}
