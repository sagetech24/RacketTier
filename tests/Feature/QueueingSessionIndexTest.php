<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_queueing_index_includes_finished_sessions_from_today(): void
    {
        $user = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $active = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Active Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $user->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $active->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $finishedToday = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Done Queue',
            'sport_id' => $sport->id,
            'match_type' => 'doubles',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
            'completed_matches_count' => 3,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $finishedToday->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 2,
            'losses_count' => 1,
            'session_points' => 68,
        ]);

        $finishedYesterday = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Old Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'started_at' => now()->subDay(),
            'ended_at' => now()->subDay(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $finishedYesterday->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/game-sessions?session_context=queueing');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $active->id);
        $response->assertJsonCount(1, 'finished_today');
        $response->assertJsonPath('finished_today.0.id', $finishedToday->id);
        $response->assertJsonPath('finished_today.0.is_active', false);
    }

    public function test_queueing_index_reflects_draft_snapshot_player_and_match_counts(): void
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Draft Counts',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $host->id,
            'skill_level' => 3,
        ])->assertOk();

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $opponent->id,
            'skill_level' => 3,
        ])->assertOk();

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Walk-in',
            'skill_level' => 2,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $this->assertCount(3, $players);

        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];

        $matchId = (int) $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => [
                ['id' => $hostPlayerId, 'team' => 1],
                ['id' => $opponentPlayerId, 'team' => 2],
            ],
        ])->assertCreated()->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/start')
            ->assertOk();

        $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
            'team1_score' => 21,
            'team2_score' => 10,
            'queueing_session_match_id' => $matchId,
        ])->assertOk();

        $this->assertSame(0, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());

        $response = $this->actingAs($host)->getJson('/auth/game-sessions?session_context=queueing');

        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('id', $sessionId);
        $this->assertNotNull($row);
        $this->assertSame(3, $row['participant_count']);
        $this->assertSame(1, $row['completed_matches_count']);
    }

    public function test_facility_index_does_not_include_finished_today_key(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => 1,
            'session_context' => 'facility',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'game_type' => '1st-set',
            'started_at' => now(),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($host)->getJson('/auth/game-sessions');

        $response->assertOk();
        $response->assertJsonMissingPath('finished_today');
    }
}
