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
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.session_context', 'queueing');
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.win_points', 30);
        $response->assertJsonPath('data.loss_points', 8);

        $id = $response->json('data.id');
        $this->assertNotNull($id);
        $session = GameSession::query()->findOrFail($id);
        $this->assertTrue($session->isQueueing());
        $this->assertNull($session->facility_id);
    }
}
