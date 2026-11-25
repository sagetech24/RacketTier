<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionReserveMatchTest extends TestCase
{
    use RefreshDatabase;

    private function seedQueueingDoublesSession(User $host): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Reserve Queue',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
            'persistence_state' => 'persisted',
        ]);

        $users = [$host, User::factory()->create(), User::factory()->create(), User::factory()->create()];
        $pos = 1;
        foreach ($users as $u) {
            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $u->id,
                'queue_position' => $pos++,
                'is_waiting' => true,
                'is_playing' => false,
            ]);
        }

        return $session;
    }

    /**
     * @return list<GameSessionPlayer>
     */
    private function players(GameSession $session): array
    {
        return GameSessionPlayer::query()
            ->where('game_session_id', $session->id)
            ->orderBy('queue_position')
            ->get()
            ->all();
    }

    public function test_host_can_create_reserve_match_with_playing_and_bench_players(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $players[0]->update(['is_playing' => true, 'is_waiting' => false]);
        $players[1]->update(['is_waiting' => false, 'is_playing' => false]);

        $lineup = [
            ['id' => $players[0]->id, 'team' => 1],
            ['id' => $players[1]->id, 'team' => 1],
            ['id' => $players[2]->id, 'team' => 2],
            ['id' => $players[3]->id, 'team' => 2],
        ];

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            ['lineup' => $lineup],
        );

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'reserved');

        $this->assertDatabaseHas('queueing_session_matches', [
            'game_session_id' => $session->id,
            'status' => 'reserved',
        ]);

        $players[0]->refresh();
        $this->assertTrue($players[0]->is_playing);
        $this->assertFalse($players[0]->is_waiting);
    }

    public function test_cannot_double_book_player_already_on_queueing_or_reserve_match(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $players[1]->id, 'team' => 1],
                    ['id' => $players[2]->id, 'team' => 2],
                    ['id' => $players[3]->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $extra = User::factory()->create();
        $bench = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $extra->id,
            'queue_position' => 5,
            'is_waiting' => true,
            'is_playing' => false,
        ]);
        $extra2 = User::factory()->create();
        $bench2 = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $extra2->id,
            'queue_position' => 6,
            'is_waiting' => true,
            'is_playing' => false,
        ]);
        $extra3 = User::factory()->create();
        $bench3 = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $extra3->id,
            'queue_position' => 7,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $bench->id, 'team' => 1],
                    ['id' => $bench2->id, 'team' => 2],
                    ['id' => $bench3->id, 'team' => 2],
                ],
            ],
        );

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'One or more players are already assigned to a queued or reserved match.',
        ]);
    }

    public function test_promote_blocked_while_player_playing_then_succeeds_when_ready(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $players[0]->update(['is_playing' => true, 'is_waiting' => false]);

        $create = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $players[1]->id, 'team' => 1],
                    ['id' => $players[2]->id, 'team' => 2],
                    ['id' => $players[3]->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $matchId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/promote',
        )->assertStatus(422);

        $players[0]->update(['is_playing' => false, 'is_waiting' => true]);

        $promote = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/promote',
        );

        $promote->assertOk();
        $promote->assertJsonPath('data.status', 'queueing');

        $this->assertSame('queueing', QueueingSessionMatch::query()->findOrFail($matchId)->status);
    }

    public function test_cannot_start_reserved_match_until_promoted(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $create = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $players[1]->id, 'team' => 1],
                    ['id' => $players[2]->id, 'team' => 2],
                    ['id' => $players[3]->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $matchId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        )->assertStatus(422);

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/promote',
        )->assertOk();

        $start = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        );

        $start->assertOk();
        $start->assertJsonPath('data.status', 'ongoing');
    }

    public function test_cannot_create_more_than_four_reserve_matches(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);

        for ($i = 0; $i < 4; $i++) {
            $batch = [];
            for ($j = 0; $j < 4; $j++) {
                $user = User::factory()->create();
                $batch[] = GameSessionPlayer::query()->create([
                    'game_session_id' => $session->id,
                    'user_id' => $user->id,
                    'queue_position' => 10 + ($i * 4) + $j,
                    'is_waiting' => true,
                    'is_playing' => false,
                ]);
            }

            $this->actingAs($host)->postJson(
                '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
                [
                    'lineup' => [
                        ['id' => $batch[0]->id, 'team' => 1],
                        ['id' => $batch[1]->id, 'team' => 1],
                        ['id' => $batch[2]->id, 'team' => 2],
                        ['id' => $batch[3]->id, 'team' => 2],
                    ],
                ],
            )->assertCreated();
        }

        $extra = [];
        for ($j = 0; $j < 4; $j++) {
            $user = User::factory()->create();
            $extra[] = GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $user->id,
                'queue_position' => 100 + $j,
                'is_waiting' => true,
                'is_playing' => false,
            ]);
        }

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            [
                'lineup' => [
                    ['id' => $extra[0]->id, 'team' => 1],
                    ['id' => $extra[1]->id, 'team' => 1],
                    ['id' => $extra[2]->id, 'team' => 2],
                    ['id' => $extra[3]->id, 'team' => 2],
                ],
            ],
        );

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'You can reserve at most 4 matches at a time.',
        ]);
        $this->assertSame(
            4,
            QueueingSessionMatch::query()
                ->where('game_session_id', $session->id)
                ->where('status', 'reserved')
                ->count(),
        );
    }

    public function test_reserved_players_are_excluded_from_manual_queue_create(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/reserve',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $players[1]->id, 'team' => 1],
                    ['id' => $players[2]->id, 'team' => 2],
                    ['id' => $players[3]->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 1],
                    ['id' => $players[1]->id, 'team' => 1],
                    ['id' => $players[2]->id, 'team' => 2],
                    ['id' => $players[3]->id, 'team' => 2],
                ],
            ],
        );

        $response->assertStatus(422);
    }
}
