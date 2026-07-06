<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SendUserEmailVerification;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateUserProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class UserProfileUpdateController extends Controller
{
    public function __invoke(
        UpdateUserProfileRequest $request,
        SendUserEmailVerification $sendUserEmailVerification,
    ): JsonResponse {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'age' => $validated['age'] ?? null,
            'pronoun' => $validated['pronoun'] ?? null,
        ]);

        $emailChanged = $user->isDirty('email');
        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        $verificationEmailSent = null;
        if ($emailChanged) {
            $verificationEmailSent = $sendUserEmailVerification($user);
        }

        return response()->json([
            'user' => new UserResource($user->fresh()),
            'verification_email_sent' => $verificationEmailSent,
        ]);
    }
}
