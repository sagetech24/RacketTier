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
        $response->assertJsonPath('user.email', User::ADMIN_EMAIL);
    }

    public function test_auth_user_is_admin_when_email_matches_regardless_of_flag(): void
    {
        $user = User::factory()->create([
            'email' => 'Marnelle24@gmail.com',
            'is_admin' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/user');

        $response->assertOk();
        $response->assertJsonPath('user.is_admin', true);
    }

    public function test_auth_user_is_not_admin_when_flag_true_but_email_differs(): void
    {
        $user = User::factory()->create([
            'is_admin' => true,
        ]);

        $response = $this->actingAs($user)->getJson('/auth/user');

        $response->assertOk();
        $response->assertJsonPath('user.is_admin', false);
    }
}
