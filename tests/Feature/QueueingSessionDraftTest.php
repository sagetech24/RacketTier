<?php

namespace Tests\Feature;

use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\QueueingSessionMatch;
use App\Models\Ranking;
use App\Models\RatingHistory;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueingSessionDraftTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_queueing_session_starts_in_draft_mode_without_roster_rows(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Draft Night',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.persistence_state', 'draft');

        $sessionId = (int) $response->json('data.id');
        $session = GameSession::query()->findOrFail($sessionId);

        $this->assertTrue($session->isDraft());
        $this->assertNotNull($session->draft_snapshot);
        $this->assertSame(0, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());
        $this->assertSame(0, QueueingSessionMatch::query()->where('game_session_id', $sessionId)->count());
    }

    public function test_draft_session_keeps_roster_and_matches_off_database_until_end(): void
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Deferred Persist',
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

        $this->assertSame(0, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $this->assertCount(2, $players);

        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];

        $matchCreate = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => [
                ['id' => $hostPlayerId, 'team' => 1],
                ['id' => $opponentPlayerId, 'team' => 2],
            ],
        ])->assertCreated();

        $matchId = (int) $matchCreate->json('data.id');
        $this->assertSame(0, QueueingSessionMatch::query()->where('game_session_id', $sessionId)->count());

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/start')
            ->assertOk();

        $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
            'team1_score' => 21,
            'team2_score' => 10,
            'queueing_session_match_id' => $matchId,
        ])->assertOk();

        $this->assertSame(0, RatingHistory::query()->where('game_session_id', $sessionId)->count());
        $this->assertSame(0, MemberPointWallet::query()->where('user_id', $host->id)->count());
        $this->assertSame(0, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/end')->assertOk();

        $session = GameSession::query()->findOrFail($sessionId);
        $this->assertFalse($session->is_active);
        $this->assertSame('persisted', $session->persistence_state);
        $this->assertNull($session->draft_snapshot);

        $this->assertSame(2, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());
        $this->assertSame(1, QueueingSessionMatch::query()->where('game_session_id', $sessionId)->count());
        $this->assertSame(2, RatingHistory::query()->where('game_session_id', $sessionId)->count());

        $hostWallet = MemberPointWallet::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->first();
        $this->assertNotNull($hostWallet);
        $this->assertSame(30, (int) $hostWallet->balance);

        $hostRanking = Ranking::query()
            ->where('user_id', $host->id)
            ->where('sport_id', $session->sport_id)
            ->first();
        $this->assertNotNull($hostRanking);
        $this->assertGreaterThan(1000, (int) $hostRanking->rating);
    }

    public function test_draft_version_increments_on_mutations(): void
    {
        $host = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Versioned Draft',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');
        $this->assertSame(0, (int) $create->json('data.draft_version'));

        $add = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $host->id,
            'skill_level' => 2,
        ])->assertOk();

        $this->assertGreaterThan(0, (int) $add->json('data.draft_version'));
    }

    public function test_draft_guest_auto_match_respects_lineup_teams_when_queue_order_differs(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Guest Team Order',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        // Member joins first (queue pos 1) but lower skill; guest joins second with higher skill.
        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
            'skill_level' => 1,
        ])->assertOk();

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Ace Guest',
            'skill_level' => 5,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $memberPlayerId = (int) $players->firstWhere('user.id', $member->id)['id'];
        $guestPlayerId = (int) $players->firstWhere('is_guest', true)['id'];

        $proposals = $this->actingAs($host)->getJson('/auth/queueing-sessions/'.$sessionId.'/matches/auto-proposals')
            ->assertOk();
        $lineup = collect($proposals->json('data.proposals.0.lineup'));
        $guestTeam = (int) $lineup->firstWhere('id', $guestPlayerId)['team'];
        $memberTeam = (int) $lineup->firstWhere('id', $memberPlayerId)['team'];
        $this->assertNotSame($guestTeam, $memberTeam);

        $matchCreate = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => $lineup->all(),
        ])->assertCreated();
        $matchId = (int) $matchCreate->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/start')
            ->assertOk();

        // UI shows guest on team 1 and member on team 2; member wins.
        if ($memberTeam === 2) {
            $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
                'team1_score' => 10,
                'team2_score' => 21,
                'queueing_session_match_id' => $matchId,
            ])->assertOk();
        } else {
            $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
                'team1_score' => 21,
                'team2_score' => 10,
                'queueing_session_match_id' => $matchId,
            ])->assertOk();
        }

        $after = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $memberRow = collect($after->json('data.players'))->firstWhere('user.id', $member->id);
        $guestRow = collect($after->json('data.players'))->firstWhere('is_guest', true);

        $this->assertSame(30, (int) $memberRow['session_points']);
        $this->assertSame(1, (int) $memberRow['wins_count']);
        $this->assertSame(8, (int) $guestRow['session_points']);
        $this->assertSame(1, (int) $guestRow['losses_count']);
    }

    public function test_draft_guest_auto_match_updates_member_session_points_on_leaderboard(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Guest Draft Leaderboard',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
            'skill_level' => 1,
        ])->assertOk();

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'guest_name' => 'Ace Guest',
            'skill_level' => 5,
        ])->assertOk();

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $memberPlayerId = (int) $players->firstWhere('user.id', $member->id)['id'];
        $guestPlayerId = (int) $players->firstWhere('is_guest', true)['id'];

        $proposals = $this->actingAs($host)->getJson('/auth/queueing-sessions/'.$sessionId.'/matches/auto-proposals')
            ->assertOk();
        $lineup = collect($proposals->json('data.proposals.0.lineup'));
        $this->assertNotEmpty($lineup);
        $guestTeam = (int) $lineup->firstWhere('id', $guestPlayerId)['team'];

        $matchCreate = $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches', [
            'lineup' => $lineup->all(),
        ])->assertCreated();

        $matchId = (int) $matchCreate->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/matches/'.$matchId.'/start')
            ->assertOk();

        if ($guestTeam === 1) {
            $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
                'team1_score' => 21,
                'team2_score' => 10,
                'queueing_session_match_id' => $matchId,
            ])->assertOk();
        } else {
            $this->actingAs($host)->postJson('/auth/game-sessions/'.$sessionId.'/finish-match', [
                'team1_score' => 10,
                'team2_score' => 21,
                'queueing_session_match_id' => $matchId,
            ])->assertOk();
        }

        $after = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $memberRow = collect($after->json('data.players'))->firstWhere('user.id', $member->id);
        $guestRow = collect($after->json('data.players'))->firstWhere('is_guest', true);

        $this->assertNotNull($memberRow);
        $this->assertNotNull($guestRow);
        $this->assertSame(30, (int) $guestRow['session_points']);
        $this->assertSame(1, (int) $guestRow['wins_count']);
        $this->assertSame(8, (int) $memberRow['session_points']);
        $this->assertSame(1, (int) $memberRow['losses_count']);
        $this->assertSame($guestPlayerId, (int) $guestRow['id']);
        $this->assertSame($memberPlayerId, (int) $memberRow['id']);
    }

    public function test_participant_can_view_draft_session_before_persist(): void
    {
        $host = User::factory()->create();
        $member = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Shared Draft',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
            'user_id' => $member->id,
            'skill_level' => 2,
        ])->assertOk();

        $this->actingAs($member)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
    }

    public function test_removed_player_who_finished_matches_appears_on_ended_leaderboard(): void
    {
        $host = User::factory()->create();
        $opponent = User::factory()->create();
        $bench = User::factory()->create();

        $create = $this->actingAs($host)->postJson('/auth/queueing-sessions', [
            'queue_name' => 'Remove Then End',
            'sport_slug' => 'badminton',
            'match_type' => 'singles',
            'win_points' => 30,
            'loss_points' => 8,
        ])->assertCreated();

        $sessionId = (int) $create->json('data.id');

        foreach ([$host, $opponent, $bench] as $user) {
            $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/players', [
                'user_id' => $user->id,
                'skill_level' => 3,
            ])->assertOk();
        }

        $show = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $players = collect($show->json('data.players'));
        $hostPlayerId = (int) $players->firstWhere('user.id', $host->id)['id'];
        $opponentPlayerId = (int) $players->firstWhere('user.id', $opponent->id)['id'];
        $benchPlayerId = (int) $players->firstWhere('user.id', $bench->id)['id'];

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

        $this->actingAs($host)
            ->deleteJson('/auth/queueing-sessions/'.$sessionId.'/players/'.$opponentPlayerId)
            ->assertOk();

        $afterRemove = $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk();
        $afterPlayers = collect($afterRemove->json('data.players'));
        $removedRow = $afterPlayers->firstWhere('id', $opponentPlayerId);
        $this->assertNotNull($removedRow);
        $this->assertTrue((bool) $removedRow['is_removed']);
        $this->assertSame(8, (int) $removedRow['session_points']);
        $this->assertFalse((bool) $removedRow['is_waiting']);

        // Bench player with no matches is hard-deleted.
        $this->actingAs($host)
            ->deleteJson('/auth/queueing-sessions/'.$sessionId.'/players/'.$benchPlayerId)
            ->assertOk();
        $afterBench = collect(
            $this->actingAs($host)->getJson('/auth/game-sessions/'.$sessionId)->assertOk()->json('data.players'),
        );
        $this->assertNull($afterBench->firstWhere('id', $benchPlayerId));

        $this->actingAs($host)->postJson('/auth/queueing-sessions/'.$sessionId.'/end')->assertOk();

        $summary = $this->actingAs($host)
            ->getJson('/auth/queueing-sessions/'.$sessionId.'/summary')
            ->assertOk()
            ->json('data');

        $summaryNames = collect($summary['players'] ?? [])->pluck('name')->all();
        $this->assertContains($host->name, $summaryNames);
        $this->assertContains($opponent->name, $summaryNames);
        $this->assertNotContains($bench->name, $summaryNames);
        $this->assertSame(2, (int) ($summary['totals']['players'] ?? 0));

        $opponentSummary = collect($summary['players'])->firstWhere('name', $opponent->name);
        $this->assertNotNull($opponentSummary);
        $this->assertSame(0, (int) $opponentSummary['wins']);
        $this->assertSame(1, (int) $opponentSummary['losses']);
        $this->assertSame(8, (int) $opponentSummary['earned_points']);

        $this->assertSame(2, GameSessionPlayer::query()->where('game_session_id', $sessionId)->count());

        $opponentWallet = MemberPointWallet::query()
            ->where('user_id', $opponent->id)
            ->where('sport_id', GameSession::query()->findOrFail($sessionId)->sport_id)
            ->first();
        $this->assertNotNull($opponentWallet);
        $this->assertSame(8, (int) $opponentWallet->balance);
    }
}
