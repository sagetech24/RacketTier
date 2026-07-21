<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use App\Services\QueueingSessionDraftStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuplicateQueueingSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_requires_authentication(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeFinishedSession($host, $sport, 'Friday Smash');

        $this->postJson('/auth/queueing-sessions/'.$session->id.'/duplicate')
            ->assertStatus(401);
    }

    public function test_host_can_duplicate_finished_session_with_settings_and_roster(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $source = $this->makeFinishedSession($host, $sport, 'Friday Smash', [
            'match_type' => 'doubles',
            'win_points' => 30,
            'loss_points' => 8,
            'skip_scores' => true,
            'optional_guest_skill' => false,
            'optional_guest_gender' => true,
            'auto_match_criteria' => [
                'skill_level' => true,
                'skill_match_mode' => 'same_level',
                'wl_statistics' => false,
                'sequence' => true,
                'genderless_mixed' => false,
            ],
            'completed_matches_count' => 3,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $source->id,
            'user_id' => $member->id,
            'guest_name' => null,
            'pronoun' => 'He/Him',
            'skill_level' => 4,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 2,
            'losses_count' => 1,
            'session_points' => 68,
        ]);
        GameSessionPlayer::query()->create([
            'game_session_id' => $source->id,
            'user_id' => null,
            'guest_name' => 'Alex Guest',
            'pronoun' => 'They/Them',
            'skill_level' => 2,
            'queue_position' => 2,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 1,
            'losses_count' => 2,
            'session_points' => 0,
        ]);
        GameSessionPlayer::query()->create([
            'game_session_id' => $source->id,
            'user_id' => $host->id,
            'guest_name' => null,
            'pronoun' => 'She/Her',
            'skill_level' => 3,
            'queue_position' => 3,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $match = QueueingSessionMatch::query()->create([
            'game_session_id' => $source->id,
            'match_no' => 1,
            'status' => 'finished',
            'lineup' => [],
            'winning_team' => 1,
            'team1_score' => 21,
            'team2_score' => 15,
            'finished_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$source->id.'/duplicate')
            ->assertCreated();

        $newId = (int) $response->json('data.id');
        $this->assertNotSame($source->id, $newId);

        $response->assertJsonPath('data.queue_name', 'Friday Smash');
        $response->assertJsonPath('data.match_type', 'doubles');
        $response->assertJsonPath('data.win_points', 30);
        $response->assertJsonPath('data.loss_points', 8);
        $response->assertJsonPath('data.skip_scores', true);
        $response->assertJsonPath('data.optional_guest_skill', false);
        $response->assertJsonPath('data.optional_guest_gender', true);
        $response->assertJsonPath('data.auto_match_criteria.skill_match_mode', 'same_level');
        $response->assertJsonPath('data.auto_match_criteria.wl_statistics', false);
        $response->assertJsonPath('data.is_active', true);
        $response->assertJsonPath('data.persistence_state', 'draft');
        $response->assertJsonPath('data.completed_matches_count', 0);
        $response->assertJsonPath('data.created_by.id', $host->id);
        $response->assertJsonPath('data.sport.slug', 'badminton');
        $response->assertJsonCount(3, 'data.players');

        $players = collect($response->json('data.players'))->sortBy('queue_position')->values();
        $this->assertSame($member->id, $players[0]['user']['id']);
        $this->assertFalse($players[0]['is_guest']);
        $this->assertSame(4, $players[0]['skill_level']);
        $this->assertSame('He/Him', $players[0]['pronoun']);
        $this->assertTrue($players[0]['is_waiting']);
        $this->assertFalse($players[0]['is_playing']);
        $this->assertSame(0, $players[0]['wins_count'] ?? 0);

        $this->assertTrue($players[1]['is_guest']);
        $this->assertNull($players[1]['user']);
        $this->assertSame('Alex Guest', $players[1]['guest_name']);
        $this->assertSame(2, $players[1]['skill_level']);

        $this->assertSame($host->id, $players[2]['user']['id']);
        $this->assertSame(3, $players[2]['skill_level']);

        $this->assertDatabaseMissing('queueing_session_matches', [
            'game_session_id' => $newId,
        ]);
        $this->assertDatabaseHas('queueing_session_matches', [
            'id' => $match->id,
            'game_session_id' => $source->id,
        ]);

        $draft = app(QueueingSessionDraftStore::class)->load($newId);
        $this->assertCount(3, $draft->players);
        $this->assertSame([], $draft->matches);
    }

    public function test_non_host_participant_cannot_duplicate(): void
    {
        $host = User::factory()->create();
        $participant = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $source = $this->makeFinishedSession($host, $sport, 'Joined Queue');

        GameSessionPlayer::query()->create([
            'game_session_id' => $source->id,
            'user_id' => $participant->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'skill_level' => 3,
        ]);

        $this->actingAs($participant)
            ->postJson('/auth/queueing-sessions/'.$source->id.'/duplicate')
            ->assertForbidden();
    }

    public function test_active_session_cannot_be_duplicated(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $active = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'persistence_state' => 'draft',
            'queue_name' => 'Live Queue',
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

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$active->id.'/duplicate')
            ->assertStatus(422);
    }

    public function test_admin_can_duplicate_another_hosts_finished_session(): void
    {
        $host = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $source = $this->makeFinishedSession($host, $sport, 'Admin Copy Target');

        GameSessionPlayer::query()->create([
            'game_session_id' => $source->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'skill_level' => 3,
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/auth/queueing-sessions/'.$source->id.'/duplicate')
            ->assertCreated();

        $response->assertJsonPath('data.created_by.id', $admin->id);
        $response->assertJsonPath('data.queue_name', 'Admin Copy Target');
        $response->assertJsonCount(1, 'data.players');
        $response->assertJsonPath('data.players.0.user.id', $host->id);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeFinishedSession(User $host, Sport $sport, string $name, array $overrides = []): GameSession
    {
        return GameSession::query()->create(array_merge([
            'facility_id' => null,
            'session_context' => 'queueing',
            'persistence_state' => 'persisted',
            'queue_name' => $name,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'skip_scores' => false,
            'optional_guest_skill' => true,
            'optional_guest_gender' => true,
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
            'completed_matches_count' => 1,
        ], $overrides));
    }
}
