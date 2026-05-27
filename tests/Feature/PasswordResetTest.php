<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'alice@example.com',
        ]);

        $response = $this->postJson('/auth/password/forgot', [
            'email' => $user->email,
        ]);

        $response->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'alice@example.com',
        ]);

        $response = $this->postJson('/auth/password/reset', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.token.0', 'Invalid or expired reset token.');
    }

    public function test_reset_password_updates_password_when_token_is_valid(): void
    {
        $user = User::factory()->create([
            'email' => 'alice@example.com',
        ]);

        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/auth/password/reset', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
    }
}

