<?php

namespace Tests\Feature;

use App\Actions\Auth\SendUserEmailVerification;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_verification_notification(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertRedirect('/verify-email');

        $user = User::where('email', 'alice@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertAuthenticatedAs($user);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_registration_succeeds_when_verification_email_cannot_be_sent(): void
    {
        $this->mock(SendUserEmailVerification::class, function ($mock): void {
            $mock->shouldReceive('__invoke')->once()->andReturn(false);
        });

        $response = $this->post('/register', [
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertRedirect('/verify-email');

        $user = User::where('email', 'bob@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
    }

    public function test_signed_verification_link_marks_email_verified(): void
    {
        Event::fake();

        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification())],
        );

        $response = $this->actingAs($user)->get($url);

        $response->assertRedirect('/profile?verified=1');
        $this->assertNotNull($user->fresh()->email_verified_at);
        Event::assertDispatched(Verified::class);
    }

    public function test_resend_verification_endpoint_sends_notification(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)
            ->postJson('/email/verification-notification');

        $response->assertOk();
        $response->assertJsonPath('already_verified', false);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_resend_verification_skips_when_already_verified(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/email/verification-notification');

        $response->assertOk();
        $response->assertJsonPath('already_verified', true);
        Notification::assertNothingSentTo($user);
    }

    public function test_profile_email_change_clears_verification_and_resends_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $this->assertNotNull($user->email_verified_at);

        $response = $this->actingAs($user)
            ->patchJson('/auth/user', [
                'name' => $user->name,
                'email' => 'updated@example.com',
            ]);

        $response->assertOk();
        $response->assertJsonPath('user.email', 'updated@example.com');
        $response->assertJsonPath('user.email_verified', false);
        $this->assertNull($user->fresh()->email_verified_at);

        Notification::assertSentTo($user->fresh(), VerifyEmail::class);
    }

    public function test_user_resource_exposes_verification_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/user');

        $response->assertOk();
        $response->assertJsonPath('user.email_verified', true);
        $response->assertJsonStructure(['user' => ['email_verified', 'email_verified_at']]);
    }
}
