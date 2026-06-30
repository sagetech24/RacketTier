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
}
