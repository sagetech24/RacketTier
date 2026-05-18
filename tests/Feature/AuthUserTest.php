<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_user_includes_is_admin_default_false(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/user');

        $response->assertOk();
        $response->assertJsonPath('user.id', $user->id);
        $response->assertJsonPath('user.is_admin', false);
    }

    public function test_auth_user_includes_is_admin_when_true(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)->getJson('/auth/user');

        $response->assertOk();
        $response->assertJsonPath('user.is_admin', true);
    }
}
