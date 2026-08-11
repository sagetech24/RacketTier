<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\MemberPointWallet;
use App\Models\Ranking;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityPlayersIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_facility_players(): void
    {
        $this->getJson(route('auth.facility-players'))->assertUnauthorized();
    }

    public function test_players_include_rating_rank_and_most_active_sport(): void
    {
        $viewer = User::factory()->create();
        $peer = User::factory()->create(['name' => 'Casey Court']);
        $champion = User::factory()->create(['name' => 'Aria Ace']);

        $badminton = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $tennis = Sport::query()->where('slug', 'tennis')->firstOrFail();
        $facility = Facility::query()->orderBy('id')->firstOrFail();

        $this->recordFinishedSession($peer, $facility, $tennis, wins: 5, losses: 2, finishedAt: now()->subDays(3));
        $this->recordFinishedSession($peer, $facility, $badminton, wins: 1, losses: 0, finishedAt: now()->subDay());

        Ranking::query()->create([
            'user_id' => $champion->id,
            'sport_id' => $tennis->id,
            'rating' => 1300,
        ]);
        Ranking::query()->create([
            'user_id' => $peer->id,
            'sport_id' => $tennis->id,
            'rating' => 1120,
        ]);
        Ranking::query()->create([
            'user_id' => $peer->id,
            'sport_id' => $badminton->id,
            'rating' => 1400,
        ]);

        MemberPointWallet::query()->create([
            'user_id' => $peer->id,
            'sport_id' => $tennis->id,
            'balance' => 40,
        ]);
        MemberPointWallet::query()->create([
            'user_id' => $peer->id,
            'sport_id' => $badminton->id,
            'balance' => 15,
        ]);

        $response = $this->actingAs($viewer)->getJson(route('auth.facility-players'));

        $response->assertOk();
        $peerPayload = collect($response->json('data'))->firstWhere('id', $peer->id);
        $this->assertNotNull($peerPayload);
        $this->assertSame(1400, $peerPayload['rating']);
        $this->assertSame(2, $peerPayload['rank']);
        $this->assertSame(55, $peerPayload['total_point_balance']);
        $this->assertSame(6, $peerPayload['stats']['wins']);
        $this->assertSame(2, $peerPayload['stats']['losses']);
        $this->assertSame(8, $peerPayload['stats']['total_matches']);
        $this->assertSame('tennis', $peerPayload['primary_sport']['slug']);
        $this->assertSame($tennis->name, $peerPayload['primary_sport']['name']);
        $this->assertSame($tennis->icon, $peerPayload['primary_sport']['icon']);
    }

    public function test_players_without_matches_have_empty_dashboard_stats(): void
    {
        $viewer = User::factory()->create();
        $peer = User::factory()->create(['name' => 'New Member']);

        $response = $this->actingAs($viewer)->getJson(route('auth.facility-players'));

        $response->assertOk();
        $peerPayload = collect($response->json('data'))->firstWhere('id', $peer->id);
        $this->assertNotNull($peerPayload);
        $this->assertNull($peerPayload['rating']);
        $this->assertSame(0, $peerPayload['total_point_balance']);
        $this->assertSame(0, $peerPayload['stats']['total_matches']);
        $this->assertNull($peerPayload['rank']);
        $this->assertNull($peerPayload['primary_sport']);
    }

    public function test_ranking_without_session_stats_still_fills_profile(): void
    {
        $viewer = User::factory()->create();
        $peer = User::factory()->create(['name' => 'Riley Rally']);
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();

        Ranking::query()->create([
            'user_id' => $peer->id,
            'sport_id' => $sport->id,
            'rating' => 984,
        ]);

        $response = $this->actingAs($viewer)->getJson(route('auth.facility-players'));

        $response->assertOk();
        $peerPayload = collect($response->json('data'))->firstWhere('id', $peer->id);
        $this->assertNotNull($peerPayload);
        $this->assertSame(984, $peerPayload['rating']);
        $this->assertSame(1, $peerPayload['rank']);
        $this->assertSame('badminton', $peerPayload['primary_sport']['slug']);
    }

    private function recordFinishedSession(
        User $user,
        Facility $facility,
        Sport $sport,
        int $wins,
        int $losses,
        mixed $finishedAt,
    ): void {
        $session = GameSession::query()->create([
            'facility_id' => $facility->id,
            'session_context' => 'facility',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'last_finished_at' => $finishedAt,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
            'wins_count' => $wins,
            'losses_count' => $losses,
        ]);
    }
}
