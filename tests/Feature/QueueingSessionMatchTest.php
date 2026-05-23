<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\QueueingSessionMatch;
use App\Models\RatingHistory;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionMatchTest extends TestCase
{
    use RefreshDatabase;

    private function seedQueueingDoublesSession(User $host): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Test Queue',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
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

    public function test_host_can_create_queued_match_without_putting_players_on_court(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $lineup = [
            ['id' => $players[0]->id, 'team' => 1],
            ['id' => $players[1]->id, 'team' => 1],
            ['id' => $players[2]->id, 'team' => 2],
            ['id' => $players[3]->id, 'team' => 2],
        ];

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            ['lineup' => $lineup],
        );

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'queueing');
        $response->assertJsonPath('data.started_at', null);

        $this->assertDatabaseHas('queueing_session_matches', [
            'game_session_id' => $session->id,
            'status' => 'queueing',
        ]);

        foreach ($players as $p) {
            $p->refresh();
            $this->assertTrue($p->is_waiting);
            $this->assertFalse($p->is_playing);
        }

        $session->refresh();
        $this->assertSame('queueing', $session->status);
    }

    public function test_host_can_start_queued_match_and_delete_queued_match(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $create = $this->actingAs($host)->postJson(
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

        $matchId = (int) $create->json('data.id');

        $start = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        );

        $start->assertOk();
        $start->assertJsonPath('data.status', 'ongoing');

        $match = QueueingSessionMatch::query()->findOrFail($matchId);
        $this->assertSame('ongoing', $match->status);
        $this->assertNotNull($match->started_at);

        foreach (array_slice($players, 0, 4) as $p) {
            $p->refresh();
            $this->assertTrue($p->is_playing);
            $this->assertFalse($p->is_waiting);
        }

        $session2 = $this->seedQueueingDoublesSession($host);
        $players2 = $this->players($session2);
        $queued = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session2->id.'/matches',
            [
                'lineup' => [
                    ['id' => $players2[0]->id, 'team' => 1],
                    ['id' => $players2[1]->id, 'team' => 1],
                    ['id' => $players2[2]->id, 'team' => 2],
                    ['id' => $players2[3]->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $queuedId = (int) $queued->json('data.id');

        $this->actingAs($host)->deleteJson(
            '/auth/queueing-sessions/'.$session2->id.'/matches/'.$queuedId,
        )->assertOk();

        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $queuedId]);
    }

    public function test_host_can_update_queued_match_lineup(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $create = $this->actingAs($host)->postJson(
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

        $matchId = (int) $create->json('data.id');

        $swap = $this->actingAs($host)->patchJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId,
            [
                'lineup' => [
                    ['id' => $players[0]->id, 'team' => 2],
                    ['id' => $players[1]->id, 'team' => 2],
                    ['id' => $players[2]->id, 'team' => 1],
                    ['id' => $players[3]->id, 'team' => 1],
                ],
            ],
        );

        $swap->assertOk();
        $swap->assertJsonPath('data.status', 'queueing');

        $match = QueueingSessionMatch::query()->findOrFail($matchId);
        $lineup = is_array($match->lineup) ? $match->lineup : [];
        $teams = collect($lineup)->pluck('team', 'game_session_player_id');
        $this->assertSame(2, (int) $teams->get($players[0]->id));
        $this->assertSame(1, (int) $teams->get($players[2]->id));
    }

    public function test_host_can_cancel_ongoing_match_and_release_players(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $create = $this->actingAs($host)->postJson(
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

        $matchId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        )->assertOk();

        $this->actingAs($host)->deleteJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId,
        )->assertOk();

        $this->assertDatabaseMissing('queueing_session_matches', ['id' => $matchId]);

        foreach (array_slice($players, 0, 4) as $p) {
            $p->refresh();
            $this->assertFalse($p->is_playing);
            $this->assertTrue($p->is_waiting);
            $this->assertNull($p->team);
        }

        $session->refresh();
        $this->assertSame('queueing', $session->status);
    }

    public function test_cannot_assign_player_already_in_another_queued_match(): void
    {
        $host = User::factory()->create();
        $session = $this->seedQueueingDoublesSession($host);
        $players = $this->players($session);

        $lineup = [
            ['id' => $players[0]->id, 'team' => 1],
            ['id' => $players[1]->id, 'team' => 1],
            ['id' => $players[2]->id, 'team' => 2],
            ['id' => $players[3]->id, 'team' => 2],
        ];

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            ['lineup' => $lineup],
        )->assertCreated();

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            ['lineup' => $lineup],
        );

        $response->assertUnprocessable();
    }

    public function test_guest_earns_session_points_on_finish_without_wallet_or_elo(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Guest Points Queue',
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $hostPlayer = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $guestPlayer = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'guest_name' => 'Ace Guest',
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $create = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            [
                'lineup' => [
                    ['id' => $hostPlayer->id, 'team' => 1],
                    ['id' => $guestPlayer->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $matchId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        )->assertOk();

        $session->refresh();
        $this->assertSame('ongoing', $session->status);

        $finish = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'team1_score' => 21,
            'team2_score' => 15,
            'queueing_session_match_id' => $matchId,
        ]);

        $finish->assertOk();

        $hostPlayer->refresh();
        $guestPlayer->refresh();

        $this->assertSame(30, (int) $hostPlayer->session_points);
        $this->assertSame(8, (int) $guestPlayer->session_points);
        $this->assertSame(1, (int) $hostPlayer->wins_count);
        $this->assertSame(1, (int) $guestPlayer->losses_count);

        $this->assertSame(30, (int) MemberPointWallet::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $sport->id)
            ->value('balance'));
        $this->assertDatabaseCount('member_point_wallets', 1);

        $this->assertSame(1, RatingHistory::query()->where('game_session_id', $session->id)->count());

        $match = QueueingSessionMatch::query()->findOrFail($matchId);
        $breakdown = is_array($match->result_breakdown) ? $match->result_breakdown : [];
        $players = collect($breakdown['players'] ?? []);
        $guestRow = $players->firstWhere('guest_name', 'Ace Guest');
        $this->assertNotNull($guestRow);
        $this->assertSame(8, (int) ($guestRow['session_points_earned'] ?? -1));
        $this->assertNull($guestRow['rating_change'] ?? null);
    }

    public function test_host_can_finish_match_by_winning_team_when_skip_scores_enabled(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Skip Scores Queue',
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'skip_scores' => true,
            'started_at' => now(),
        ]);

        $p1 = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $p2 = GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => User::factory()->create()->id,
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        $create = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches',
            [
                'lineup' => [
                    ['id' => $p1->id, 'team' => 1],
                    ['id' => $p2->id, 'team' => 2],
                ],
            ],
        )->assertCreated();

        $matchId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/'.$matchId.'/start',
        )->assertOk();

        $finish = $this->actingAs($host)->postJson('/auth/game-sessions/'.$session->id.'/finish-match', [
            'winning_team' => 1,
            'queueing_session_match_id' => $matchId,
        ]);

        $finish->assertOk();

        $match = QueueingSessionMatch::query()->findOrFail($matchId);
        $this->assertSame('finished', $match->status);
        $this->assertNull($match->team1_score);
        $this->assertNull($match->team2_score);
        $this->assertSame(1, (int) $match->winning_team);

        $p1->refresh();
        $this->assertSame(1, (int) $p1->wins_count);
        $this->assertSame(30, (int) $p1->session_points);
    }
}
