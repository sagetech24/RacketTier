<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicQueueingSessionSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_view_finished_session_summary_without_private_fields(): void
    {
        $host = User::factory()->create(['name' => 'Queue Master', 'email' => 'qm@example.com']);
        $member = User::factory()->create(['name' => 'Member Player', 'email' => 'member@example.com']);
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeFinishedSession($host, $sport, 'Friday Night');

        $hostRow = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 1,
            'losses_count' => 0,
            'session_points' => 25,
        ]);
        $guestRow = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => null,
            'guest_name' => 'Walk-in Guest',
            'queue_position' => 2,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => 0,
            'losses_count' => 1,
            'session_points' => 8,
            'skill_level' => 2,
        ]);

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'finished',
            'lineup' => [
                [
                    'game_session_player_id' => $hostRow->id,
                    'user_id' => $host->id,
                    'name' => 'Queue Master',
                    'team' => 1,
                ],
                [
                    'game_session_player_id' => $guestRow->id,
                    'user_id' => null,
                    'guest_name' => 'Walk-in Guest',
                    'name' => 'Walk-in Guest',
                    'team' => 2,
                ],
            ],
            'team1_score' => 21,
            'team2_score' => 15,
            'winning_team' => 1,
            'started_at' => now()->subHour(),
            'finished_at' => now()->subMinutes(30),
            'result_breakdown' => [
                'players' => [
                    [
                        'user_id' => $member->id,
                        'email' => 'member@example.com',
                        'rating_before' => 1000,
                        'rating_after' => 1016,
                    ],
                ],
            ],
        ]);

        $key = $session->publicSummaryKey();
        $this->assertSame($session->id.'-friday-night', $key);

        $response = $this->getJson('/public/queueing-sessions/'.$key);

        $response->assertOk();
        $response->assertJsonPath('data.session.queue_name', 'Friday Night');
        $response->assertJsonPath('data.session.queue_master_name', 'Queue Master');
        $response->assertJsonPath('data.session.sport.name', 'Badminton');
        $response->assertJsonPath('data.summary.totals.matches', 1);
        $response->assertJsonPath('data.summary.players.0.name', 'Queue ****');
        $response->assertJsonPath('data.summary.players.0.earned_points', 25);
        $response->assertJsonPath('data.summary.players.1.name', 'Walk-in Guest');
        $response->assertJsonPath('data.matches.0.match_no', 1);
        $response->assertJsonPath('data.matches.0.team1_score', 21);
        $response->assertJsonPath('data.matches.0.lineup.0.name', 'Queue ****');
        $response->assertJsonPath('data.matches.0.lineup.1.name', 'Walk-in Guest');
        $this->assertStringNotContainsString('Queue Master', (string) $response->json('data.summary.players.0.name'));

        $encoded = $response->getContent();
        $this->assertIsString($encoded);
        $this->assertStringNotContainsString('qm@example.com', $encoded);
        $this->assertStringNotContainsString('member@example.com', $encoded);
        $this->assertStringNotContainsString('user_id', $encoded);
        $this->assertStringNotContainsString('rating_before', $encoded);
        $this->assertStringNotContainsString('result_breakdown', $encoded);
    }

    public function test_public_summary_rejects_active_wrong_slug_and_unknown_sessions(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $finished = $this->makeFinishedSession($host, $sport, 'Friday Night');
        $active = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Friday Night',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'started_at' => now(),
        ]);

        $this->getJson('/public/queueing-sessions/'.$active->publicSummaryKey())->assertNotFound();
        $this->getJson('/public/queueing-sessions/'.$finished->id.'-saturday-night')->assertNotFound();
        $this->getJson('/public/queueing-sessions/999999-friday-night')->assertNotFound();
    }

    public function test_authenticated_show_includes_public_summary_path_only_after_the_session_ends(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $active = GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => 'Live Queue',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'started_at' => now(),
        ]);
        $finished = $this->makeFinishedSession($host, $sport, 'Friday Night');

        $this->actingAs($host)
            ->getJson('/auth/game-sessions/'.$active->id)
            ->assertOk()
            ->assertJsonMissingPath('data.public_summary_path');

        $this->actingAs($host)
            ->getJson('/auth/game-sessions/'.$finished->id)
            ->assertOk()
            ->assertJsonPath('data.public_summary_path', '/q/'.$finished->publicSummaryKey());
    }

    public function test_blank_queue_name_uses_session_slug(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $session = $this->makeFinishedSession($host, $sport, '   ');

        $this->assertSame($session->id.'-session', $session->publicSummaryKey());
        $this->getJson('/public/queueing-sessions/'.$session->publicSummaryKey())->assertOk();
    }

    private function makeFinishedSession(User $host, Sport $sport, string $name): GameSession
    {
        return GameSession::query()->create([
            'facility_id' => null,
            'session_context' => 'queueing',
            'queue_name' => $name,
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => false,
            'status' => 'finished',
            'game_type' => 'queueing',
            'started_at' => now()->subHours(2),
            'ended_at' => now()->subHour(),
            'completed_matches_count' => 1,
        ]);
    }
}
