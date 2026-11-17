<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Ranking;
use App\Models\Sport;
use App\Models\TierRank;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_summary(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/auth/admin/summary')->assertForbidden();
    }

    public function test_admin_can_load_summary(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->unverified()->create();
        Facility::query()->create([
            'name' => 'Court One',
            'address' => '1 Main',
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->getJson('/auth/admin/summary');

        $response->assertOk();
        $response->assertJsonPath('data.total_members', 2);
        $response->assertJsonPath('data.unverified_members', 1);
        $response->assertJsonStructure([
            'data' => [
                'total_members',
                'unverified_members',
                'total_facilities',
                'active_queueing_sessions',
                'matches_finished_today',
                'queueing_sessions_ended_today',
            ],
        ]);
        $this->assertGreaterThanOrEqual(1, (int) $response->json('data.total_facilities'));
    }

    public function test_admin_can_view_member_detail_and_adjust_rating(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->create();
        $sport = Sport::query()->orderBy('id')->firstOrFail();

        Ranking::query()->create([
            'user_id' => $member->id,
            'sport_id' => $sport->id,
            'rating' => 1000,
        ]);

        $detail = $this->actingAs($admin)->getJson('/auth/admin/members/'.$member->id);
        $detail->assertOk();
        $detail->assertJsonPath('data.user.id', $member->id);

        $adjust = $this->actingAs($admin)->postJson('/auth/admin/members/'.$member->id.'/adjust-rating', [
            'sport_id' => $sport->id,
            'amount' => 25,
            'reason' => 'Manual correction after dispute',
        ]);
        $adjust->assertOk();
        $adjust->assertJsonPath('data.rating_after', 1025);

        $this->assertDatabaseHas('rankings', [
            'user_id' => $member->id,
            'sport_id' => $sport->id,
            'rating' => 1025,
        ]);
        $this->assertDatabaseHas('admin_adjustment_audits', [
            'admin_user_id' => $admin->id,
            'target_user_id' => $member->id,
            'adjustment_type' => 'rating',
            'amount' => 25,
        ]);
    }

    public function test_admin_can_archive_and_restore_facility(): void
    {
        $admin = User::factory()->admin()->create();
        $facility = Facility::query()->create([
            'name' => 'Archive Me',
            'address' => '2 Court',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->deleteJson('/auth/facilities/'.$facility->id)
            ->assertOk();

        $this->assertSoftDeleted('facilities', ['id' => $facility->id]);

        $this->actingAs($admin)
            ->postJson('/auth/facilities/'.$facility->id.'/restore')
            ->assertOk();

        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'deleted_at' => null,
        ]);
    }

    public function test_admin_can_list_and_update_tier_ranks(): void
    {
        $admin = User::factory()->admin()->create();
        $sport = Sport::query()->orderBy('id')->firstOrFail();
        $tier = TierRank::query()->firstOrCreate(
            [
                'sport_id' => $sport->id,
                'tier_no' => 9,
            ],
            [
                'name' => 'Custom Ops',
                'start_point' => 900000,
                'end_point' => 900100,
                'status' => false,
            ],
        );

        $list = $this->actingAs($admin)->getJson('/auth/admin/tier-ranks?sport_id='.$sport->id);
        $list->assertOk();
        $this->assertTrue(
            collect($list->json('data.tiers'))->contains(fn (array $row): bool => (int) $row['id'] === (int) $tier->id),
        );

        $update = $this->actingAs($admin)->patchJson('/auth/admin/tier-ranks/'.$tier->id, [
            'name' => 'Custom Ops Plus',
            'status' => false,
        ]);
        $update->assertOk();
        $update->assertJsonPath('data.name', 'Custom Ops Plus');
    }

    public function test_admin_flag_alone_grants_admin_access(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'email' => 'ops@example.com',
        ]);

        $this->actingAs($admin)->getJson('/auth/admin/summary')->assertOk();
    }
}
