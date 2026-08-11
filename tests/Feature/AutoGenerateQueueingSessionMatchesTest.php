<?php

namespace Tests\Feature;

use App\Actions\AutoGenerateQueueingSessionMatches;
use App\Data\AutoMatchCriteria;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
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

        return GameSession::query()->create([
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
    }

    private function addPlayer(
        GameSession $session,
        int $queuePosition,
        int $skillLevel,
        int $wins = 0,
        int $losses = 0,
        ?User $user = null,
        ?string $pronoun = null,
        ?string $lastMatchResult = null,
        ?int $lastMatchId = null,
    ): GameSessionPlayer {
        return GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => ($user ?? User::factory()->create())->id,
            'queue_position' => $queuePosition,
            'is_waiting' => true,
            'is_playing' => false,
            'skill_level' => $skillLevel,
            'pronoun' => $pronoun,
            'wins_count' => $wins,
            'losses_count' => $losses,
            'last_match_result' => $lastMatchResult,
            'last_match_id' => $lastMatchId,
        ]);
    }

    public function test_same_level_mode_groups_singles_by_skill_level(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $lowFirst = $this->addPlayer($session, 1, 1);
        $highSecond = $this->addPlayer($session, 2, 5);
        $lowThird = $this->addPlayer($session, 3, 1);
        $highFourth = $this->addPlayer($session, 4, 5);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_SAME_LEVEL);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertFalse($result['has_stats']);
        $this->assertCount(2, $result['proposals']);

        $firstIds = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $secondIds = collect($result['proposals'][1]['lineup'])->pluck('id')->sort()->values()->all();

        $this->assertSame([$highSecond->id, $highFourth->id], $firstIds);
        $this->assertSame([$lowFirst->id, $lowThird->id], $secondIds);
        $this->assertSame('Level 5 — Pro Elite', $result['proposals'][0]['bracket_label']);
        $this->assertSame('Level 1 — Starter', $result['proposals'][1]['bracket_label']);
    }

    public function test_balanced_mode_pairs_high_with_low_in_singles(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $lowFirst = $this->addPlayer($session, 1, 1);
        $highSecond = $this->addPlayer($session, 2, 5);
        $lowThird = $this->addPlayer($session, 3, 1);
        $highFourth = $this->addPlayer($session, 4, 5);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(2, $result['proposals']);

        foreach ($result['proposals'] as $proposal) {
            $levels = collect($proposal['players'])->pluck('skill_level')->unique()->values()->all();
            $this->assertCount(2, $levels);
            $this->assertSame('Balanced skill', $proposal['bracket_label']);
        }

        $allPairs = collect($result['proposals'])
            ->map(fn (array $p): array => collect($p['lineup'])->pluck('id')->sort()->values()->all())
            ->all();

        $this->assertContains(
            collect([$highSecond->id, $lowFirst->id])->sort()->values()->all(),
            $allPairs,
        );
        $this->assertContains(
            collect([$highFourth->id, $lowThird->id])->sort()->values()->all(),
            $allPairs,
        );
    }

    public function test_with_stats_prioritizes_win_rate_band_over_skill_level(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $highSkillLowForm = $this->addPlayer($session, 1, 5, 0, 2);
        $lowSkillHotStreak = $this->addPlayer($session, 2, 1, 2, 0);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_SAME_LEVEL);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertTrue($result['has_stats']);
        $this->assertCount(1, $result['proposals']);

        $ids = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertSame(
            collect([$lowSkillHotStreak->id, $highSkillLowForm->id])->sort()->values()->all(),
            $ids,
        );
        $this->assertSame('Mixed bracket', $result['proposals'][0]['bracket_label']);
    }

    public function test_balanced_doubles_snake_pairs_high_with_low(): void
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
        $p4 = $this->addPlayer($session, 2, 4);
        $p2 = $this->addPlayer($session, 3, 2);
        $p1 = $this->addPlayer($session, 4, 1);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(1, $result['proposals']);
        $lineup = collect($result['proposals'][0]['lineup'])->keyBy('id');

        $this->assertSame(1, $lineup[$p5->id]['team']);
        $this->assertSame(1, $lineup[$p1->id]['team']);
        $this->assertSame(2, $lineup[$p4->id]['team']);
        $this->assertSame(2, $lineup[$p2->id]['team']);
        $this->assertSame('Balanced skill', $result['proposals'][0]['bracket_label']);
    }

    public function test_same_level_doubles_groups_same_tier_on_opposing_teams(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Doubles Same Level',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $p5a = $this->addPlayer($session, 1, 5);
        $p5b = $this->addPlayer($session, 2, 5);
        $p5c = $this->addPlayer($session, 3, 5);
        $p5d = $this->addPlayer($session, 4, 5);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_SAME_LEVEL);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(1, $result['proposals']);
        $lineup = collect($result['proposals'][0]['lineup'])->keyBy('id');

        $this->assertSame(1, $lineup[$p5a->id]['team']);
        $this->assertSame(1, $lineup[$p5b->id]['team']);
        $this->assertSame(2, $lineup[$p5c->id]['team']);
        $this->assertSame(2, $lineup[$p5d->id]['team']);
        $this->assertSame('Level 5 — Pro Elite', $result['proposals'][0]['bracket_label']);
    }

    public function test_sequence_only_uses_fifo_when_skill_disabled(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $first = $this->addPlayer($session, 1, 5);
        $second = $this->addPlayer($session, 2, 1);

        $criteria = new AutoMatchCriteria(
            skillLevel: false,
            wlStatistics: false,
            sequence: true,
            genderlessMixed: false,
        );
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $ids = collect($result['proposals'][0]['lineup'])->pluck('id')->all();
        $this->assertSame([$first->id, $second->id], $ids);
    }

    public function test_genderless_mixed_swaps_doubles_teams_for_mixed_pronouns(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Genderless Mixed',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $heA = $this->addPlayer($session, 1, 5, pronoun: 'He/Him');
        $heB = $this->addPlayer($session, 2, 4, pronoun: 'He/Him');
        $sheA = $this->addPlayer($session, 3, 3, pronoun: 'She/Her');
        $sheB = $this->addPlayer($session, 4, 2, pronoun: 'She/Her');

        $criteria = new AutoMatchCriteria(
            skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED,
            genderlessMixed: true,
        );
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $lineup = collect($result['proposals'][0]['lineup'])->keyBy('id');
        $team1Pronouns = collect([$heA->id, $heB->id, $sheA->id, $sheB->id])
            ->filter(fn (int $id): bool => $lineup[$id]['team'] === 1)
            ->map(fn (int $id): ?string => GameSessionPlayer::query()->find($id)?->pronoun)
            ->filter()
            ->values()
            ->all();

        $this->assertCount(2, $team1Pronouns);
        $this->assertNotSame($team1Pronouns[0], $team1Pronouns[1]);
    }

    public function test_auto_proposals_endpoint_returns_criteria_and_skill_level(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 4);
        $this->addPlayer($session, 2, 2);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals?skill_match_mode=balanced',
        );

        $response->assertOk();
        $response->assertJsonPath('data.criteria.skill_level', true);
        $response->assertJsonPath('data.criteria.skill_match_mode', 'balanced');
        $response->assertJsonPath('data.criteria.genderless_mixed', true);
        $response->assertJsonPath('data.has_stats', false);
        $response->assertJsonPath('data.proposals.0.players.0.skill_level', 4);
        $response->assertJsonPath('data.proposals.0.bracket_label', 'Balanced skill');
    }

    public function test_auto_proposals_endpoint_accepts_same_level_mode(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 4);
        $this->addPlayer($session, 2, 4);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals?skill_match_mode=same_level',
        );

        $response->assertOk();
        $response->assertJsonPath('data.criteria.skill_match_mode', 'same_level');
        $response->assertJsonPath('data.proposals.0.bracket_label', 'Level 4 — Advance');
    }

    public function test_refresh_seed_can_change_balanced_singles_pairings(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $this->addPlayer($session, 1, 1);
        $this->addPlayer($session, 2, 5);
        $this->addPlayer($session, 3, 1);
        $this->addPlayer($session, 4, 5);

        $baseCriteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $initial = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $baseCriteria);
        $refreshed = app(AutoGenerateQueueingSessionMatches::class)->execute(
            $session,
            new AutoMatchCriteria(
                skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED,
                refreshSeed: 42,
            ),
        );

        $initialPairs = collect($initial['proposals'])
            ->map(fn (array $p): array => collect($p['lineup'])->pluck('id')->sort()->values()->all())
            ->all();
        $refreshedPairs = collect($refreshed['proposals'])
            ->map(fn (array $p): array => collect($p['lineup'])->pluck('id')->sort()->values()->all())
            ->all();

        $this->assertNotSame($initialPairs, $refreshedPairs);
        $this->assertStringStartsWith('auto-42-', $refreshed['proposals'][0]['proposal_id']);
    }

    public function test_auto_proposals_endpoint_uses_session_stored_criteria_when_no_query_params(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $session->update([
            'auto_match_criteria' => [
                'skill_level' => true,
                'skill_match_mode' => AutoMatchCriteria::SKILL_MODE_SAME_LEVEL,
                'wl_statistics' => false,
                'sequence' => true,
                'genderless_mixed' => true,
            ],
        ]);
        $this->addPlayer($session, 1, 4);
        $this->addPlayer($session, 2, 4);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals',
        );

        $response->assertOk();
        $response->assertJsonPath('data.criteria.skill_match_mode', 'same_level');
        $response->assertJsonPath('data.criteria.wl_statistics', false);
        $response->assertJsonPath('data.proposals.0.bracket_label', 'Level 4 — Advance');
    }

    public function test_auto_proposals_endpoint_accepts_refresh_seed(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);
        $this->addPlayer($session, 1, 5);
        $this->addPlayer($session, 2, 1);
        $this->addPlayer($session, 3, 5);
        $this->addPlayer($session, 4, 1);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals?refresh_seed=2',
        );

        $response->assertOk();
        $response->assertJsonPath('data.criteria.refresh_seed', 2);
        $response->assertJsonPath('data.proposals.0.proposal_id', 'auto-2-1');
    }

    public function test_fairness_prioritizes_players_with_fewer_matches(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $playedTwice = $this->addPlayer($session, 1, 5, 2, 0);
        $playedOnce = $this->addPlayer($session, 2, 1, 1, 0);
        $fresh = $this->addPlayer($session, 3, 3, 0, 0);
        $this->addPlayer($session, 4, 2, 2, 1);

        $criteria = new AutoMatchCriteria(
            skillLevel: false,
            wlStatistics: false,
            sequence: true,
            genderlessMixed: false,
        );
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $ids = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertSame(
            collect([$playedOnce->id, $fresh->id])->sort()->values()->all(),
            $ids,
        );
    }

    public function test_queue_first_doubles_includes_zero_game_players_at_front_of_queue(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Fresh Queue Doubles',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $freshA = $this->addPlayer($session, 1, 3, 0, 0);
        $freshB = $this->addPlayer($session, 2, 3, 0, 0);
        $freshC = $this->addPlayer($session, 3, 3, 0, 0);
        $filler = $this->addPlayer($session, 4, 3, 0, 1, lastMatchResult: 'loss', lastMatchId: 1);

        // Extra played players further back in queue — must not jump ahead of fresh.
        $this->addPlayer($session, 5, 5, 1, 0, lastMatchResult: 'win', lastMatchId: 1);
        $this->addPlayer($session, 6, 4, 1, 0, lastMatchResult: 'win', lastMatchId: 2);
        $this->addPlayer($session, 7, 2, 0, 1, lastMatchResult: 'loss', lastMatchId: 2);
        $this->addPlayer($session, 8, 1, 0, 1, lastMatchResult: 'loss', lastMatchId: 1);

        $criteria = new AutoMatchCriteria(
            skillLevel: false,
            wlStatistics: false,
            sequence: true,
            genderlessMixed: false,
        );
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $firstIds = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertSame(
            collect([$freshA->id, $freshB->id, $freshC->id, $filler->id])->sort()->values()->all(),
            $firstIds,
        );
    }

    public function test_wl_doubles_does_not_orphan_fresh_players_behind_loser_pools(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'WL Fresh Orphan Doubles',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $freshA = $this->addPlayer($session, 1, 3, 0, 0);
        $freshB = $this->addPlayer($session, 2, 3, 0, 0);
        $freshC = $this->addPlayer($session, 3, 3, 0, 0);

        for ($i = 0; $i < 4; $i++) {
            $this->addPlayer($session, 4 + $i, 3, 1, 0, lastMatchResult: 'win', lastMatchId: 10 + $i);
        }
        for ($i = 0; $i < 4; $i++) {
            $this->addPlayer($session, 8 + $i, 3, 0, 1, lastMatchResult: 'loss', lastMatchId: 20 + $i);
        }

        $criteria = new AutoMatchCriteria(
            skillLevel: false,
            wlStatistics: true,
            sequence: true,
            genderlessMixed: false,
        );
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $matchedIds = collect($result['proposals'])
            ->flatMap(fn (array $p) => collect($p['lineup'])->pluck('id'))
            ->all();

        $this->assertContains($freshA->id, $matchedIds);
        $this->assertContains($freshB->id, $matchedIds);
        $this->assertContains($freshC->id, $matchedIds);
    }

    public function test_balanced_doubles_widens_fairness_when_min_band_is_undersized(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Fairness Undersize Doubles',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        // min=0 has 2 players; min+1 has 3 total — previously crashed under balanced skill.
        $this->addPlayer($session, 1, 5, 0, 0);
        $this->addPlayer($session, 2, 4, 0, 0);
        $this->addPlayer($session, 3, 3, 1, 0);
        $this->addPlayer($session, 4, 2, 2, 1);
        $this->addPlayer($session, 5, 1, 2, 2);
        $this->addPlayer($session, 6, 3, 3, 1);
        $this->addPlayer($session, 7, 2, 2, 0);
        $this->addPlayer($session, 8, 4, 1, 1);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertNotEmpty($result['proposals']);
        $this->assertCount(4, $result['proposals'][0]['lineup']);
    }

    public function test_balanced_singles_widens_fairness_when_min_band_is_undersized(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $this->addPlayer($session, 1, 5, 0, 0);
        $this->addPlayer($session, 2, 4, 2, 1);
        $this->addPlayer($session, 3, 3, 2, 2);
        $this->addPlayer($session, 4, 2, 3, 1);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertNotEmpty($result['proposals']);
        $this->assertCount(2, $result['proposals'][0]['lineup']);
    }

    public function test_balanced_singles_prefers_winner_bracket_when_available(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $winnerHigh = $this->addPlayer($session, 1, 5, 1, 0, lastMatchResult: 'win', lastMatchId: 10);
        $winnerLow = $this->addPlayer($session, 2, 1, 1, 0, lastMatchResult: 'win', lastMatchId: 11);
        $loserA = $this->addPlayer($session, 3, 4, 0, 1, lastMatchResult: 'loss', lastMatchId: 10);
        $loserB = $this->addPlayer($session, 4, 2, 0, 1, lastMatchResult: 'loss', lastMatchId: 11);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(2, $result['proposals']);
        $this->assertSame('Winner bracket', $result['proposals'][0]['bracket_label']);

        $firstIds = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertSame(
            collect([$winnerHigh->id, $winnerLow->id])->sort()->values()->all(),
            $firstIds,
        );

        $secondIds = collect($result['proposals'][1]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertSame(
            collect([$loserA->id, $loserB->id])->sort()->values()->all(),
            $secondIds,
        );
    }

    public function test_balanced_singles_avoids_loser_vs_loser_when_winners_available(): void
    {
        $host = User::factory()->create();
        $session = $this->seedSinglesSession($host);

        $loserA = $this->addPlayer($session, 1, 5, 0, 1, lastMatchResult: 'loss', lastMatchId: 1);
        $winner = $this->addPlayer($session, 2, 3, 1, 0, lastMatchResult: 'win', lastMatchId: 2);
        $loserB = $this->addPlayer($session, 3, 1, 0, 1, lastMatchResult: 'loss', lastMatchId: 3);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(1, $result['proposals']);
        $ids = collect($result['proposals'][0]['lineup'])->pluck('id')->sort()->values()->all();
        $this->assertContains($winner->id, $ids);
        $this->assertNotSame(
            collect([$loserA->id, $loserB->id])->sort()->values()->all(),
            $ids,
        );
    }

    public function test_winner_bracket_doubles_uses_recent_winners(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Winner Bracket Doubles',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $w1 = $this->addPlayer($session, 1, 5, 1, 0, lastMatchResult: 'win', lastMatchId: 1);
        $w2 = $this->addPlayer($session, 2, 4, 1, 0, lastMatchResult: 'win', lastMatchId: 2);
        $w3 = $this->addPlayer($session, 3, 2, 1, 0, lastMatchResult: 'win', lastMatchId: 3);
        $w4 = $this->addPlayer($session, 4, 1, 1, 0, lastMatchResult: 'win', lastMatchId: 4);

        $criteria = new AutoMatchCriteria(skillMatchMode: AutoMatchCriteria::SKILL_MODE_BALANCED);
        $result = app(AutoGenerateQueueingSessionMatches::class)->execute($session, $criteria);

        $this->assertCount(1, $result['proposals']);
        $this->assertSame('Winner bracket', $result['proposals'][0]['bracket_label']);

        $lineup = collect($result['proposals'][0]['lineup'])->keyBy('id');
        $this->assertSame(1, $lineup[$w1->id]['team']);
        $this->assertSame(1, $lineup[$w4->id]['team']);
        $this->assertSame(2, $lineup[$w2->id]['team']);
        $this->assertSame(2, $lineup[$w3->id]['team']);
    }

    public function test_auto_proposals_returns_eligibility_breakdown_when_not_enough_players(): void
    {
        $host = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        $session = GameSession::query()->create([
            'facility_id' => null,
            'sport_id' => $sport->id,
            'session_context' => 'queueing',
            'queue_name' => 'Breakdown Test',
            'match_type' => 'doubles',
            'created_by' => $host->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
            'started_at' => now(),
        ]);

        $playingA = $this->addPlayer($session, 1, 5);
        $playingB = $this->addPlayer($session, 2, 4);
        $playingA->update(['is_playing' => true, 'is_waiting' => false]);
        $playingB->update(['is_playing' => true, 'is_waiting' => false]);

        $queuedA = $this->addPlayer($session, 3, 3);
        $queuedB = $this->addPlayer($session, 4, 2);
        $queuedC = $this->addPlayer($session, 5, 1);
        $queuedD = $this->addPlayer($session, 6, 1);

        QueueingSessionMatch::query()->create([
            'game_session_id' => $session->id,
            'match_no' => 1,
            'status' => 'queueing',
            'lineup' => [
                ['game_session_player_id' => $queuedA->id, 'team' => 1],
                ['game_session_player_id' => $queuedB->id, 'team' => 1],
                ['game_session_player_id' => $queuedC->id, 'team' => 2],
                ['game_session_player_id' => $queuedD->id, 'team' => 2],
            ],
        ]);

        $this->addPlayer($session, 7, 5);
        $this->addPlayer($session, 8, 4);

        $response = $this->actingAs($host)->getJson(
            '/auth/queueing-sessions/'.$session->id.'/matches/auto-proposals',
        );

        $response->assertOk();
        $response->assertJsonPath('data.proposals', []);
        $response->assertJsonPath('data.total_eligible', 2);
        $response->assertJsonPath('data.required_per_match', 4);
        $response->assertJsonPath('data.eligibility_breakdown.total_roster', 8);
        $response->assertJsonPath('data.eligibility_breakdown.playing', 2);
        $response->assertJsonPath('data.eligibility_breakdown.queued_in_matches', 4);
        $response->assertJsonPath('data.eligibility_breakdown.waiting_available', 2);
        $response->assertJsonPath('data.eligibility_breakdown.not_in_queue', 0);
    }
}
