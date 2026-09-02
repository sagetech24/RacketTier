<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionPlayerStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_requires_skill_level_when_session_uses_skill_matching(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $sessionId = (int) $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Skill On',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => true,
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ])->assertCreated()->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
        ])->assertUnprocessable();
    }

    public function test_member_can_be_added_without_skill_level_when_skill_matching_disabled(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $sessionId = (int) $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Queue First',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => false,
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ])->assertCreated()->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
            'skill_level' => null,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $player = collect($show->json('data.players'))->firstWhere('user.id', $member->id);
        $this->assertNotNull($player);
        $this->assertNull($player['skill_level']);
    }

    public function test_guest_can_be_added_without_skill_level_when_skill_matching_disabled(): void
    {
        $host = User::factory()->create();

        $sessionId = (int) $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Queue First',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
            'skill_level' => false,
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
            'optional_guest_skill' => false,
        ])->assertCreated()->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Drop-in Guest',
            'pronoun' => 'They/Them',
            'skill_level' => null,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $player = collect($show->json('data.players'))->firstWhere('guest_name', 'Drop-in Guest');
        $this->assertNotNull($player);
        $this->assertNull($player['skill_level']);
    }
}
