<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMembersIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_members(): void
    {
        $response = $this->getJson('/auth/admin/members');

        $response->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_members(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/admin/members');

        $response->assertForbidden();
    }

    public function test_admin_lists_members_newest_first(): void
    {
        $older = User::factory()->create([
            'name' => 'Older Member',
            'created_at' => now()->subDays(2),
        ]);
        $newer = User::factory()->create([
            'name' => 'Newer Member',
            'created_at' => now()->subDay(),
        ]);
        $admin = User::factory()->admin()->create([
            'name' => 'Admin Member',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson('/auth/admin/members');

        $response->assertOk();
        $response->assertJsonPath('meta.total', 3);
        $response->assertJsonPath('meta.current_page', 1);
        $this->assertSame(
            [$admin->id, $newer->id, $older->id],
            collect($response->json('data'))->pluck('id')->all(),
        );
        $response->assertJsonPath('data.0.is_admin', true);
        $response->assertJsonPath('data.1.is_admin', false);
    }

    public function test_admin_lists_members_with_newer_id_first_when_created_at_ties(): void
    {
        $tiedAt = now()->subHour();
        $first = User::factory()->create(['created_at' => $tiedAt]);
        $second = User::factory()->create(['created_at' => $tiedAt]);
        $admin = User::factory()->admin()->create(['created_at' => now()]);

        $response = $this->actingAs($admin)->getJson('/auth/admin/members');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame($admin->id, $ids[0]);
        $this->assertGreaterThan($first->id, $second->id);
        $this->assertSame(
            [$second->id, $first->id],
            array_values(array_filter($ids, fn (int $id): bool => in_array($id, [$first->id, $second->id], true))),
        );
    }

    public function test_admin_can_paginate_members(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(21)->create();

        $pageOne = $this->actingAs($admin)->getJson('/auth/admin/members?per_page=20');
        $pageOne->assertOk();
        $pageOne->assertJsonPath('meta.per_page', 20);
        $pageOne->assertJsonPath('meta.last_page', 2);
        $pageOne->assertJsonPath('meta.total', 22);
        $this->assertCount(20, $pageOne->json('data'));

        $pageTwo = $this->actingAs($admin)->getJson('/auth/admin/members?page=2&per_page=20');
        $pageTwo->assertOk();
        $pageTwo->assertJsonPath('meta.current_page', 2);
        $this->assertCount(2, $pageTwo->json('data'));

        $pageOneIds = collect($pageOne->json('data'))->pluck('id');
        $pageTwoIds = collect($pageTwo->json('data'))->pluck('id');
        $this->assertTrue($pageOneIds->intersect($pageTwoIds)->isEmpty());
    }

    public function test_admin_can_search_members_by_name_or_email(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Admin']);
        $matchName = User::factory()->create([
            'name' => 'Esha Rubillos',
            'email' => 'other@example.com',
        ]);
        $matchEmail = User::factory()->create([
            'name' => 'Someone Else',
            'email' => 'esharubillos@gmail.com',
        ]);
        $unrelated = User::factory()->create([
            'name' => 'Unrelated',
            'email' => 'nope@example.com',
        ]);

        $response = $this->actingAs($admin)->getJson('/auth/admin/members?q=esha');

        $response->assertOk();
        $response->assertJsonPath('meta.total', 2);
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($matchName->id));
        $this->assertTrue($ids->contains($matchEmail->id));
        $this->assertFalse($ids->contains($unrelated->id));
        $this->assertFalse($ids->contains($admin->id));
    }
}
