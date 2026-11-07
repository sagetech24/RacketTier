<?php

namespace Tests\Feature;

use App\Actions\AutoGenerateQueueingSessionMatches;
use App\Actions\EndQueueingGameSession;
use App\Actions\RefreshQueueingSessionAutoSuggestMatches;
use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionAutoSuggestMatchesTest extends TestCase
{
    use RefreshDatabase;

    private function seedSinglesSession(User $host): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        return GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Auto Suggest Test',
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'persistence_state' => 'persisted',
            'win_points' => 30,
            'loss_points' => 8,
            'auto_match_criteria' => [
                'skill_level' => true,
                'skill_match_mode' => AutoMatchCriteria::SKILL_MODE_BALANCED,
                'wl_statistics' => false,
                'sequence' => true,
                'genderless_mixed' => true,
            ],
            'started_at' => now(),
        ]);
    }

    private function addPlayer(
        GameSession $session,
        int $queuePosition,
        int $skillLevel,
        int $wins = 0,
        int $losses = 0,
        bool $isPlaying = false,
        bool $isWaiting = true,
    ): GameSessionPlayer {
        return GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => User::factory()->create()->id,
            'queue_position' => $queuePosition,
            'is_waiting' => $isWaiting,
            'is_playing' => $isPlaying,
            'skill_level' => $skillLevel,
            'wins_count' => $wins,
            'losses_count' => $losses,
        ]);
    }

    /**
     * @param  list<GameSessionPlayer>  $players
     */
    private function putPlayersOnCourt(GameSession $session, array $players, int $matchNo = 1): QueueingSessionMatch
    {
        foreach ($players as $index => $player) {
            $player->update([
                'is_playing' => true,
                'is_waiting' => false,
                'team' => $index === 0 ? 1 : 2,
            ]);
        }

        $session->update(['status' => 'ongoing']);

        return QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => $matchNo,
            'status' => 'ongoing',
            'lineup' => [
                [
                    'game_session_player_id' => $players[0]->id,
                    'user_id' => $players[0]->user_id,
                    'guest_name' => null,
                    'name' => 'P1',
                    'team' => 1,
                ],
                [
                    'game_session_player_id' => $players[1]->id,
                    'user_id' => $players[1]->user_id,
                    'guest_name' => null,
                    'name' => 'P2',
                    'team' => 2,
                ],
            ],
            'started_at' => now(),
        ]);
    }

    public function test_lookahead_includes_playing_players_in_later_wave(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $freeA = $this->addPlayer($session, 1, 3, wins: 1, losses: 0);
        $freeB = $this->addPlayer($session, 2, 3, wins: 1, losses: 0);
        $busyC = $this->addPlayer($session, 3, 3, wins: 1, losses: 0, isPlaying: true, isWaiting: false);
        $busyD = $this->addPlayer($session, 4, 3, wins: 1, losses: 0, isPlaying: true, isWaiting: false);
        $this->putPlayersOnCourt($session, [$busyC, $busyD]);

        $result = app(AutoGenerateQueueingSessionMatches::class)->execute(
            $session->fresh(),
            $session->resolveAutoMatchCriteria(),
            [
                'limit' => 3,
                'lookahead' => true,
                'proposal_id_prefix' => 'suggest',
            ],
        );

        $this->assertCount(2, $result['proposals']);

        $firstIds = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $secondIds = collect($result['proposals'][1]['lineup'])->pluck('id')->sort()->values()->all();

        $this->assertSame([$freeA->id, $freeB->id], $firstIds);
        $this->assertTrue($result['proposals'][0]['players_ready']);
        $this->assertSame([$busyC->id, $busyD->id], $secondIds);
        $this->assertFalse($result['proposals'][1]['players_ready']);
        $this->assertEmpty(array_intersect($firstIds, $secondIds));
    }

    public function test_lookahead_marks_check_in_lobby_suggestions(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $this->addPlayer($session, 0, 4);
        $this->addPlayer($session, 0, 2);

        $result = app(AutoGenerateQueueingSessionMatches::class)->execute(
            $session->fresh(),
            $session->resolveAutoMatchCriteria(),
            [
                'limit' => 3,
                'lookahead' => true,
                'proposal_id_prefix' => 'suggest',
            ],
        );

        $this->assertNotEmpty($result['proposals']);
        $this->assertTrue($result['proposals'][0]['from_lobby']);
        $this->assertSame('Check-in', $result['proposals'][0]['bracket_label']);
        $this->assertTrue($result['proposals'][0]['players_ready']);
    }

    public function test_refresh_overwrites_auto_suggest_matches(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 3, wins: 1);
        $this->addPlayer($session, 2, 3, wins: 1);

        $session->update([
            'auto_suggest_matches' => [
                'generated_at' => now()->subHour()->toIso8601String(),
                'draft_version' => 0,
                'criteria' => [],
                'suggestions' => [
                    [
                        'suggestion_id' => 'suggest-stale',
                        'match_type' => 'singles',
                        'bracket_label' => 'Stale',
                        'from_lobby' => false,
                        'wave' => 1,
                        'players_ready' => true,
                        'lineup' => [],
                        'players' => [],
                    ],
                ],
            ],
        ]);

        $refreshed = app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh());
        $payload = $refreshed->auto_suggest_matches;

        $this->assertIsArray($payload);
        $this->assertNotEmpty($payload['suggestions']);
        $this->assertNotSame('suggest-stale', $payload['suggestions'][0]['suggestion_id']);
        $this->assertTrue($payload['suggestions'][0]['players_ready']);
    }

    public function test_approve_ready_suggestion_queues_match(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $a = $this->addPlayer($session, 1, 3, wins: 1);
        $b = $this->addPlayer($session, 2, 3, wins: 1);

        app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh());
        $session->refresh();

        $suggestionId = $session->auto_suggest_matches['suggestions'][0]['suggestion_id'] ?? null;
        $this->assertNotNull($suggestionId);
        $this->assertTrue($session->auto_suggest_matches['suggestions'][0]['players_ready']);

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-suggest/'.$suggestionId.'/approve',
        );

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'queueing');

        $this->assertDatabaseHas('queueing_session_matches', [
            'game_session_id' => $session->id,
            'status' => 'queueing',
        ]);

        $queuedLineupIds = collect($response->json('data.lineup'))
            ->pluck('game_session_player_id')
            ->sort()
            ->values()
            ->all();
        $this->assertSame([$a->id, $b->id], $queuedLineupIds);
    }

    public function test_approve_not_ready_suggestion_returns_422(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $busyC = $this->addPlayer($session, 1, 3, wins: 1, isPlaying: true, isWaiting: false);
        $busyD = $this->addPlayer($session, 2, 3, wins: 1, isPlaying: true, isWaiting: false);
        $this->putPlayersOnCourt($session, [$busyC, $busyD]);

        $session->update([
            'auto_suggest_matches' => [
                'generated_at' => now()->toIso8601String(),
                'draft_version' => 0,
                'criteria' => [],
                'suggestions' => [
                    [
                        'suggestion_id' => 'suggest-0-1',
                        'match_type' => 'singles',
                        'bracket_label' => 'Rotation',
                        'from_lobby' => false,
                        'wave' => 1,
                        'players_ready' => false,
                        'lineup' => [
                            ['id' => $busyC->id, 'team' => 1],
                            ['id' => $busyD->id, 'team' => 2],
                        ],
                        'players' => [],
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($host)->postJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-suggest/suggest-0-1/approve',
        );

        $response->assertStatus(422);
        $this->assertDatabaseCount('queueing_session_matches', 1);
    }

    public function test_updating_auto_match_criteria_regenerates_suggestions(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 4);
        $this->addPlayer($session, 2, 4);

        $session->update([
            'auto_suggest_matches' => [
                'generated_at' => now()->subMinute()->toIso8601String(),
                'draft_version' => 0,
                'criteria' => ['skill_match_mode' => 'balanced'],
                'suggestions' => [
                    [
                        'suggestion_id' => 'suggest-old',
                        'match_type' => 'singles',
                        'bracket_label' => 'Old',
                        'from_lobby' => true,
                        'wave' => 1,
                        'players_ready' => true,
                        'lineup' => [],
                        'players' => [],
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($host)->patchJson('/auth/queueing-sessions/'.$session->id, [
            'queue_name' => 'Auto Suggest Test',
            'skill_level' => true,
            'skill_match_mode' => 'same_level',
            'wl_statistics' => false,
            'sequence' => true,
            'genderless_mixed' => true,
        ]);

        $response->assertOk();
        $session->refresh();

        $this->assertIsArray($session->auto_suggest_matches);
        $this->assertNotSame('suggest-old', $session->auto_suggest_matches['suggestions'][0]['suggestion_id'] ?? null);
        $this->assertSame('same_level', $session->auto_suggest_matches['criteria']['skill_match_mode'] ?? null);
        $this->assertTrue($session->auto_suggest_matches['suggestions'][0]['from_lobby'] ?? false);
    }

    public function test_end_session_clears_auto_suggest_matches(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $session->update([
            'auto_suggest_matches' => [
                'generated_at' => now()->toIso8601String(),
                'draft_version' => 0,
                'criteria' => [],
                'suggestions' => [
                    [
                        'suggestion_id' => 'suggest-0-1',
                        'match_type' => 'singles',
                        'bracket_label' => 'Check-in',
                        'from_lobby' => true,
                        'wave' => 1,
                        'players_ready' => true,
                        'lineup' => [],
                        'players' => [],
                    ],
                ],
            ],
        ]);

        app(EndQueueingGameSession::class)->execute($session->fresh(), $host);
        $session->refresh();

        $this->assertFalse($session->is_active);
        $this->assertNull($session->auto_suggest_matches);
    }

    public function test_session_resource_exposes_auto_suggest_matches_while_active(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 3, wins: 1);
        $this->addPlayer($session, 2, 3, wins: 1);

        app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh());

        $response = $this->actingAs($host)->getJson('/auth/game-sessions/'.$session->id);
        $response->assertOk();
        $response->assertJsonPath('data.auto_suggest_matches.suggestions.0.players_ready', true);
        $this->assertNotEmpty($response->json('data.auto_suggest_matches.suggestions'));
    }

    public function test_queue_master_can_dismiss_auto_suggest_match(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 3, wins: 1);
        $this->addPlayer($session, 2, 3, wins: 1);
        $this->addPlayer($session, 3, 3, wins: 1);
        $this->addPlayer($session, 4, 3, wins: 1);

        app(RefreshQueueingSessionAutoSuggestMatches::class)->execute($session->fresh());
        $session->refresh();

        $suggestions = $session->auto_suggest_matches['suggestions'] ?? [];
        $this->assertGreaterThanOrEqual(2, count($suggestions));
        $firstId = $suggestions[0]['suggestion_id'];
        $remainingCount = count($suggestions) - 1;

        $response = $this->actingAs($host)->deleteJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-suggest/'.$firstId,
        );

        $response->assertOk();
        $session->refresh();

        $kept = $session->auto_suggest_matches['suggestions'] ?? [];
        $this->assertCount($remainingCount, $kept);
        $this->assertFalse(collect($kept)->contains(
            fn (array $row): bool => ($row['suggestion_id'] ?? '') === $firstId,
        ));
    }
}
