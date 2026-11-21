<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionOfflineSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_version_mismatch_returns_409_with_current_version(): void
    {
        $host = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Offline Conflict',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Guest A',
            'skill_level' => 2,
        ])->assertOk();

        $version = (int) GameSession::query()->findOrFail($sessionId)->draft_version;

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Guest B',
            'skill_level' => 3,
            'draft_version' => max(0, $version - 1),
        ])->assertStatus(409)
            ->assertJsonPath('message', 'Session was updated elsewhere. Please refresh and try again.')
            ->assertJsonStructure(['draft_version']);
    }

    public function test_claim_device_updates_session(): void
    {
        $host = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Device Claim',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/claim-device', [
            'device_id' => 'tablet-abc-123',
        ])->assertOk()
            ->assertJsonPath('data.offline_device_id', 'tablet-abc-123');

        $session = GameSession::query()->findOrFail($sessionId);
        $this->assertSame('tablet-abc-123', $session->offline_device_id);
        $this->assertNotNull($session->offline_claimed_at);
    }

    public function test_batch_sync_applies_guest_add_mutations(): void
    {
        $host = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Batch Sync',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');
        $version = (int) $create->json('data.draft_version');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/sync', [
            'draft_version' => $version,
            'mutations' => [
                [
                    'type' => 'add_guest',
                    'payload' => [
                        'guest_name' => 'Offline Guest',
                        'skill_level' => 2,
                    ],
                ],
            ],
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $names = collect($show->json('data.players'))->pluck('guest_name')->filter()->values()->all();
        $this->assertContains('Offline Guest', $names);
    }
}
