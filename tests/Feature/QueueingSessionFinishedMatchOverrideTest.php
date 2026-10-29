<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionFinishedMatchOverrideTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: User, 1: User, 2: int, 3: int, 4: int, 5: int}
     */
    private function createFinishedSinglesDraft(): array
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Override Queue',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'skip_scores' => false,
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

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];

        $matchCreate = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => [
                ['id' => $hostPlayerId, 'team' => 1],
                ['id' => $opponentPlayerId, 'team' => 2],
            ],
        ])->assertCreated();

        $matchId = (int) $matchCreate->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/start')
            ->assertOk();

        $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
            'team1_score' => 21,
            'team2_score' => 10,
            'queueing_session_match_id' => $matchId,
        ])->assertOk();

        return [$host, $opponent, $sessionId, $matchId, $hostPlayerId, $opponentPlayerId];
    }

    public function test_qm_can_switch_finished_result_on_active_draft(): void
    {
        [$host, $opponent, $sessionId, $matchId, $hostPlayerId, $opponentPlayerId] = $this->createFinishedSinglesDraft();

        $before = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $hostBefore = collect($before->json('data.players'))->firstWhere('id', $hostPlayerId);
        $oppBefore = collect($before->json('data.players'))->firstWhere('id', $opponentPlayerId);
        $this->assertSame(1, (int) $hostBefore['wins_count']);
        $this->assertSame(0, (int) $hostBefore['losses_count']);
        $this->assertSame(0, (int) $oppBefore['wins_count']);
        $this->assertSame(1, (int) $oppBefore['losses_count']);

        $response = $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/switch-result')
            ->assertOk();

        $this->assertSame(2, (int) $response->json('data.winning_team'));
        $this->assertSame(10, (int) $response->json('data.team1_score'));
        $this->assertSame(21, (int) $response->json('data.team2_score'));

        $after = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $hostAfter = collect($after->json('data.players'))->firstWhere('id', $hostPlayerId);
        $oppAfter = collect($after->json('data.players'))->firstWhere('id', $opponentPlayerId);
        $this->assertSame(0, (int) $hostAfter['wins_count']);
        $this->assertSame(1, (int) $hostAfter['losses_count']);
        $this->assertSame(1, (int) $oppAfter['wins_count']);
        $this->assertSame(0, (int) $oppAfter['losses_count']);

        $this->assertSame(0, RatingHistory::query()->where('game_session_id', $sessionId)->count());
        $this->assertSame(0, MemberPointWallet::query()->where('user_id', $host->id)->count());
    }

    public function test_qm_can_override_finished_pairing_on_active_draft(): void
    {
        [$host, $opponent, $sessionId, $matchId, $hostPlayerId, $opponentPlayerId] = $this->createFinishedSinglesDraft();

        // Swap sides but keep Team 1 as winner (score 21-10). Host moves to team 2 → loses.
        $response = $this->actingAs($host)->patchJson(
            '/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/finished-lineup',
            [
                'lineup' => [
                    ['id' => $opponentPlayerId, 'team' => 1],
                    ['id' => $hostPlayerId, 'team' => 2],
                ],
            ],
        )->assertOk();

        $this->assertSame(1, (int) $response->json('data.winning_team'));
        $lineup = collect($response->json('data.lineup'));
        $this->assertSame(1, (int) $lineup->firstWhere('game_session_player_id', $opponentPlayerId)['team']);
        $this->assertSame(2, (int) $lineup->firstWhere('game_session_player_id', $hostPlayerId)['team']);

        $after = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $hostAfter = collect($after->json('data.players'))->firstWhere('id', $hostPlayerId);
        $oppAfter = collect($after->json('data.players'))->firstWhere('id', $opponentPlayerId);
        $this->assertSame(0, (int) $hostAfter['wins_count']);
        $this->assertSame(1, (int) $hostAfter['losses_count']);
        $this->assertSame(1, (int) $oppAfter['wins_count']);
        $this->assertSame(0, (int) $oppAfter['losses_count']);
    }

    public function test_qm_can_switch_result_after_session_ended_and_rebuilds_globals(): void
    {
        [$host, $opponent, $sessionId, $matchId] = $this->createFinishedSinglesDraft();

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/end')->assertOk();

        $session = GameSession::query()->findOrFail($sessionId);
        $this->assertFalse($session->is_active);
        $this->assertSame('persisted', $session->persistence_state);

        $hostRankingBefore = Ranking::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $oppRankingBefore = Ranking::query()
            ->where('user_id', $opponent->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $this->assertGreaterThan(1000, (int) $hostRankingBefore->rating);
        $this->assertLessThan(1000, (int) $oppRankingBefore->rating);

        $hostWalletBefore = MemberPointWallet::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $oppWalletBefore = MemberPointWallet::query()
            ->where('user_id', $opponent->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $this->assertSame(35, (int) $hostWalletBefore->balance);
        $this->assertSame(8, (int) $oppWalletBefore->balance);

        $persistedMatch = QueueingSessionMatch::query()
            ->where('game_session_id', $sessionId)
            ->where('status', 'finished')
            ->firstOrFail();

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$persistedMatch->id.'/switch-result')
            ->assertOk()
            ->assertJsonPath('data.winning_team', 2);

        $hostRankingAfter = Ranking::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $oppRankingAfter = Ranking::query()
            ->where('user_id', $opponent->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $this->assertLessThan(1000, (int) $hostRankingAfter->rating);
        $this->assertGreaterThan(1000, (int) $oppRankingAfter->rating);

        $hostWalletAfter = $hostWalletBefore->fresh();
        $oppWalletAfter = $oppWalletBefore->fresh();
        $this->assertSame(8, (int) $hostWalletAfter->balance);
        $this->assertSame(35, (int) $oppWalletAfter->balance);

        $this->assertSame(2, RatingHistory::query()->where('game_session_id', $sessionId)->count());

        $hostPlayer = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('user_id', $host->id)
            ->firstOrFail();
        $oppPlayer = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('user_id', $opponent->id)
            ->firstOrFail();
        $this->assertSame(0, (int) $hostPlayer->wins_count);
        $this->assertSame(1, (int) $hostPlayer->losses_count);
        $this->assertSame(1, (int) $oppPlayer->wins_count);
        $this->assertSame(0, (int) $oppPlayer->losses_count);
    }

    public function test_finished_lineup_rejects_different_players(): void
    {
        [$host, $opponent, $sessionId, $matchId, $hostPlayerId] = $this->createFinishedSinglesDraft();

        $extra = User::factory()->create();
        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $extra->id,
            'skill_level' => 3,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $extraPlayerId = (int) collect($show->json('data.players'))->firstWhere('user.id', $extra->id)['id'];

        $this->actingAs($host)->patchJson(
            '/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/finished-lineup',
            [
                'lineup' => [
                    ['id' => $hostPlayerId, 'team' => 1],
                    ['id' => $extraPlayerId, 'team' => 2],
                ],
            ],
        )->assertStatus(422);
    }

    public function test_non_qm_cannot_switch_result(): void
    {
        [$host, $opponent, $sessionId, $matchId] = $this->createFinishedSinglesDraft();

        $this->actingAs($opponent)
            ->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/switch-result')
            ->assertForbidden();
    }

    public function test_repair_remaps_stale_breakdown_ids_and_can_undo_switch(): void
    {
        [$host, $opponent, $sessionId] = $this->createFinishedSinglesDraft();
        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/end')->assertOk();

        $session = GameSession::query()->findOrFail($sessionId);
        $match = QueueingSessionMatch::query()
            ->where('game_session_id', $sessionId)
            ->where('status', 'finished')
            ->firstOrFail();

        // Simulate pre-fix persist: lineup has real ids, breakdown still has draft ids.
        $hostPlayer = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('user_id', $host->id)
            ->firstOrFail();
        $oppPlayer = GameSessionPlayer::query()
            ->where('game_session_id', $sessionId)
            ->where('user_id', $opponent->id)
            ->firstOrFail();

        $breakdown = $match->result_breakdown;
        $this->assertIsArray($breakdown);
        $breakdown['players'] = collect($breakdown['players'])->map(function (array $row) use ($host, $opponent): array {
            if ((int) ($row['user_id'] ?? 0) === (int) $host->id) {
                $row['game_session_player_id'] = 900001;
            }
            if ((int) ($row['user_id'] ?? 0) === (int) $opponent->id) {
                $row['game_session_player_id'] = 900002;
            }

            return $row;
        })->all();
        $match->update(['result_breakdown' => $breakdown]);

        // Mimic wrecked rebuild: wipe session board stats.
        GameSessionPlayer::query()->where('game_session_id', $sessionId)->update([
            'wins_count' => 0,
            'losses_count' => 0,
            'session_points' => 0,
        ]);

        // Switch flipped the winner in production; undo + remap + rebuild.
        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$match->id.'/switch-result')
            ->assertOk();

        /** @var \App\Services\RebuildQueueingSessionMatchEffects $rebuild */
        $rebuild = app(\App\Services\RebuildQueueingSessionMatchEffects::class);
        $result = $rebuild->repairPersistedSession($session->fresh(), (int) $match->id);

        $this->assertSame((int) $match->id, $result['undone_match_id']);

        $match->refresh();
        $this->assertSame(1, (int) $match->winning_team);

        $hostPlayer->refresh();
        $oppPlayer->refresh();
        $this->assertSame(1, (int) $hostPlayer->wins_count);
        $this->assertSame(0, (int) $hostPlayer->losses_count);
        $this->assertGreaterThan(0, (int) $hostPlayer->session_points);
        $this->assertSame(0, (int) $oppPlayer->wins_count);
        $this->assertSame(1, (int) $oppPlayer->losses_count);

        $hostWallet = MemberPointWallet::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $oppWallet = MemberPointWallet::query()
            ->where('user_id', $opponent->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $this->assertSame(35, (int) $hostWallet->balance);
        $this->assertSame(8, (int) $oppWallet->balance);

        $hostRanking = Ranking::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->firstOrFail();
        $this->assertGreaterThan(1000, (int) $hostRanking->rating);
    }

    public function test_cannot_switch_result_on_non_finished_match(): void
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Queued Only',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
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

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];

        $matchCreate = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => [
                ['id' => $hostPlayerId, 'team' => 1],
                ['id' => $opponentPlayerId, 'team' => 2],
            ],
        ])->assertCreated();
        $matchId = (int) $matchCreate->json('data.id');

        $this->actingAs($host)
            ->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/switch-result')
            ->assertStatus(422);
    }
}
