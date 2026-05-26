<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_history_endpoint_requires_authentication(): void
    {
        $this->getJson('/auth/queueing-sessions/history')->assertStatus(401);
    }

    public function test_history_returns_finished_sessions_user_participated_in(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $hosted = $this->makeFinishedSession($user, $sport, 'Hosted Queue', now()->subDays(2));
        GameSessionPlayer::query()->create([
            'game_session_id' => $hosted->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $joined = $this->makeFinishedSession($other, $sport, 'Joined Queue', now()->subDay());
        GameSessionPlayer::query()->create([
            'game_session_id' => $joined->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $stranger = $this->makeFinishedSession($other, $sport, 'Stranger Queue', now()->subDays(3));
        GameSessionPlayer::query()->create([
            'game_session_id' => $stranger->id,
            'user_id' => $other->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

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

        $response = $this->actingAs($user)->getJson('/auth/queueing-sessions/history');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.id', $joined->id);
        $response->assertJsonPath('data.1.id', $hosted->id);
        $response->assertJsonPath('data.0.is_active', false);
        $response->assertJsonMissing(['id' => $active->id]);
        $response->assertJsonMissing(['id' => $stranger->id]);
        $response->assertJsonPath('meta.has_more', false);
        $response->assertJsonPath('meta.next_cursor', null);
    }

    public function test_history_filters_by_mine_only(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $hosted = $this->makeFinishedSession($user, $sport, 'Hosted Queue', now()->subDay());
        GameSessionPlayer::query()->create([
            'game_session_id' => $hosted->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $joined = $this->makeFinishedSession($other, $sport, 'Joined Queue', now()->subDays(2));
        GameSessionPlayer::query()->create([
            'game_session_id' => $joined->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/queueing-sessions/history?mine_only=1');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $hosted->id);
    }

    public function test_history_filters_by_search_query(): void
    {
        $user = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $a = $this->makeFinishedSession($user, $sport, 'Friday Doubles', now()->subDay());
        GameSessionPlayer::query()->create([
            'game_session_id' => $a->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $b = $this->makeFinishedSession($user, $sport, 'Sunday Singles', now()->subDays(2));
        GameSessionPlayer::query()->create([
            'game_session_id' => $b->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/queueing-sessions/history?q=Friday');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $a->id);
    }

    public function test_history_supports_cursor_pagination(): void
    {
        $user = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $sessionIds = [];
        for ($i = 0; $i < 5; $i++) {
            $session = $this->makeFinishedSession(
                $user,
                $sport,
                "Queue {$i}",
                now()->subHours($i + 1),
            );
            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $user->id,
                'queue_position' => 1,
                'is_waiting' => false,
                'is_playing' => false,
            ]);
            $sessionIds[] = $session->id;
        }

        $first = $this->actingAs($user)->getJson('/auth/queueing-sessions/history?limit=2');
        $first->assertOk();
        $first->assertJsonCount(2, 'data');
        $first->assertJsonPath('meta.has_more', true);
        $cursor = $first->json('meta.next_cursor');
        $this->assertNotEmpty($cursor);

        $second = $this->actingAs($user)->getJson(
            '/auth/queueing-sessions/history?limit=2&cursor='.urlencode($cursor),
        );
        $second->assertOk();
        $second->assertJsonCount(2, 'data');
        $second->assertJsonPath('meta.has_more', true);

        $firstIds = collect($first->json('data'))->pluck('id')->all();
        $secondIds = collect($second->json('data'))->pluck('id')->all();
        $this->assertEmpty(array_intersect($firstIds, $secondIds));

        $third = $this->actingAs($user)->getJson(
            '/auth/queueing-sessions/history?limit=2&cursor='.urlencode($second->json('meta.next_cursor')),
        );
        $third->assertOk();
        $third->assertJsonCount(1, 'data');
        $third->assertJsonPath('meta.has_more', false);
        $third->assertJsonPath('meta.next_cursor', null);
    }

    private function makeFinishedSession(User $host, Sport $sport, string $name, \Carbon\CarbonInterface $endedAt): GameSession
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
            'started_at' => $endedAt->copy()->subHours(2),
            'ended_at' => $endedAt,
            'completed_matches_count' => 1,
        ]);
    }
}
