<?php

namespace Tests\Feature;

use App\Actions\AutoGenerateQueueingSessionMatches;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutoGenerateQueueingSessionMatchesTest extends TestCase
{
    use RefreshDatabase;

    private function seedSinglesSession(User $host, int $playerCount = 4): GameSession
    {
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Auto Match Test',
            'match_type' => 'singles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        return $session;
    }

    private function addPlayer(
        GameSession $session,
        int $queuePosition,
        int $skillLevel,
        int $wins = 0,
        int $losses = 0,
        ?User $user = null,
    ): GameSessionPlayer {
        return GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => ($user ?? User::factory()->create())->id,
            'queue_position' => $queuePosition,
            'is_waiting' => true,
            'is_playing' => false,
            'skill_level' => $skillLevel,
            'wins_count' => $wins,
            'losses_count' => $losses,
        ]);
    }

    public function test_cold_start_groups_singles_by_skill_level_before_fifo(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $lowFirst = $this->addPlayer($session, 1, 1);
        $highSecond = $this->addPlayer($session, 2, 5);
        $lowThird = $this->addPlayer($session, 3, 1);
        $highFourth = $this->addPlayer($session, 4, 5);

        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session);

        $this->assertFalse($result['has_stats']);
        $this->assertCount(2, $result['proposals']);

        $firstIds = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $secondIds = collect($result['proposals'][1]['lineup'])->pluck('id')->sort()->values()->all();

        $this->assertSame(
            [$highSecond->id, $highFourth->id],
            $firstIds,
        );
        $this->assertSame(
            [$lowFirst->id, $lowThird->id],
            $secondIds,
        );
        $this->assertSame('Level 5 — Sensie', $result['proposals'][0]['bracket_label']);
        $this->assertSame('Level 1 — Starter', $result['proposals'][1]['bracket_label']);
    }

    public function test_with_stats_prioritizes_win_rate_band_over_skill_level(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $highSkillLowForm = $this->addPlayer($session, 1, 5, 0, 2);
        $lowSkillHotStreak = $this->addPlayer($session, 2, 1, 2, 0);

        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session);

        $this->assertTrue($result['has_stats']);
        $this->assertCount(1, $result['proposals']);

        $ids = collect($result['proposals'][0]['lineup'])->pluck('id')->all();
        $this->assertSame([$lowSkillHotStreak->id, $highSkillLowForm->id], $ids);
        $this->assertSame('Mixed bracket', $result['proposals'][0]['bracket_label']);
    }

    public function test_doubles_snake_pairs_by_skill_level_in_cold_start(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Doubles Auto',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $p5 = $this->addPlayer($session, 1, 5);
        $p3a = $this->addPlayer($session, 2, 3);
        $p3b = $this->addPlayer($session, 3, 3);
        $p1 = $this->addPlayer($session, 4, 1);

        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session);

        $this->assertCount(1, $result['proposals']);
        $lineup = collect($result['proposals'][0]['lineup'])->keyBy('id');

        $this->assertSame(1, $lineup[$p5->id]['team']);
        $this->assertSame(1, $lineup[$p1->id]['team']);
        $this->assertSame(2, $lineup[$p3a->id]['team']);
        $this->assertSame(2, $lineup[$p3b->id]['team']);
    }

    public function test_auto_proposals_endpoint_returns_skill_level(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 4);
        $this->addPlayer($session, 2, 2);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals',
        );

        $response->assertOk();
        $response->assertJsonPath('data.has_stats', false);
        $response->assertJsonPath('data.proposals.0.players.0.skill_level', 4);
        $response->assertJsonPath('data.proposals.0.bracket_label', 'Mixed skill levels');
    }
}
