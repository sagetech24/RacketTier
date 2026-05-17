<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\GameSession;
use App\Models\GameSessionPlayer;
use App\Models\QueueingSessionMatch;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserActivityIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_returns_facility_and_queueing_matches_for_past_week(): void
    {
        $user = User::factory()->create();
        $opponent = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $facility = Facility::query()->orderBy('id')->firstOrFail();

        $facilitySession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'session_context' => 'facility',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'last_team1_score' => 21,
            'last_team2_score' => 10,
            'last_winning_team' => 1,
            'last_finished_at' => now()->subDay(),
            'last_result_breakdown' => [
                'players' => [
                    [
                        'user_id' => $user->id,
                        'won' => true,
                        'session_points_earned' => 30,
                        'rating_change' => 12,
                    ],
                ],
            ],
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $facilitySession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $queueSession = GameSession::query()->create([
            'session_context' => 'queueing',
            'queue_name' => 'Friday Night',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'created_by' => $user->id,
            'is_active' => true,
            'status' => 'queueing',
            'game_type' => 'queueing',
            'win_points' => 30,
            'loss_points' => 8,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $queueSession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $queueSession->id,
            'user_id' => $opponent->id,
            'queue_position' => 2,
            'is_waiting' => true,
            'is_playing' => false,
        ]);

        QueueingSessionMatch::query()->create([
            'game_session_id' => $queueSession->id,
            'match_no' => 1,
            'status' => 'finished',
            'team1_score' => 21,
            'team2_score' => 18,
            'winning_team' => 1,
            'finished_at' => now()->subHours(3),
            'result_breakdown' => [
                'players' => [
                    [
                        'user_id' => $user->id,
                        'won' => true,
                        'session_points_earned' => 30,
                        'rating_change' => 8,
                    ],
                    [
                        'user_id' => $opponent->id,
                        'won' => false,
                        'session_points_earned' => 8,
                        'rating_change' => -8,
                    ],
                ],
            ],
        ]);

        $oldSession = GameSession::query()->create([
            'facility_id' => $facility->id,
            'session_context' => 'facility',
            'sport_id' => $sport->id,
            'match_type' => 'singles',
            'game_type' => '1st-set',
            'created_by' => $user->id,
            'is_active' => false,
            'status' => 'finished',
            'last_finished_at' => now()->subDays(10),
        ]);

        GameSessionPlayer::query()->create([
            'game_session_id' => $oldSession->id,
            'user_id' => $user->id,
            'queue_position' => 1,
            'is_waiting' => false,
            'is_playing' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/activity?limit=10');

        $response->assertOk();
        $response->assertJsonPath('meta.has_more', false);
        $kinds = collect($response->json('data'))->pluck('kind')->all();
        $this->assertContains('facility_match', $kinds);
        $this->assertContains('queueing_match', $kinds);
        $this->assertNotContains('facility_match:'.$oldSession->id, collect($response->json('data'))->pluck('id')->all());
    }

    public function test_activity_supports_cursor_pagination(): void
    {
        $user = User::factory()->create();
        $sport = Sport::query()->where('slug', 'badminton')->firstOrFail();
        $facility = Facility::query()->orderBy('id')->firstOrFail();

        foreach ([1, 2, 3] as $offsetDays) {
            $session = GameSession::query()->create([
                'facility_id' => $facility->id,
                'session_context' => 'facility',
                'sport_id' => $sport->id,
                'match_type' => 'singles',
                'game_type' => '1st-set',
                'created_by' => $user->id,
                'is_active' => false,
                'status' => 'finished',
                'last_team1_score' => 21,
                'last_team2_score' => 15,
                'last_finished_at' => now()->subDays($offsetDays),
                'last_result_breakdown' => [
                    'players' => [
                        ['user_id' => $user->id, 'won' => true, 'session_points_earned' => 10, 'rating_change' => 5],
                    ],
                ],
            ]);

            GameSessionPlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $user->id,
                'queue_position' => 1,
                'is_waiting' => false,
                'is_playing' => false,
            ]);
        }

        $first = $this->actingAs($user)->getJson('/auth/activity?limit=2');
        $first->assertOk();
        $first->assertJsonPath('meta.has_more', true);
        $this->assertCount(2, $first->json('data'));

        $cursor = $first->json('meta.next_cursor');
        $this->assertNotEmpty($cursor);

        $second = $this->actingAs($user)->getJson('/auth/activity?limit=2&cursor='.urlencode((string) $cursor));
        $second->assertOk();
        $this->assertCount(1, $second->json('data'));
        $second->assertJsonPath('meta.has_more', false);
    }
}
