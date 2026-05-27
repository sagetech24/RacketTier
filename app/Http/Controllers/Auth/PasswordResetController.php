<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->validated(),
            function ($user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ]);

                // `setRememberToken()` returns void, so do not chain it.
                $user->setRememberToken(Str::random(60));
                $user->save();
            },
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password reset.',
            ]);
        }

        // Keep the frontend experience consistent with existing login/register pages:
        // return `422` + field errors keyed by input name.
        if ($status === Password::INVALID_TOKEN) {
            return response()->json([
                'errors' => [
                    'token' => ['Invalid or expired reset token.'],
                ],
            ], 422);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'errors' => [
                    'token' => ['Too many requests. Please try again later.'],
                ],
            ], 422);
        }

        return response()->json([
            'errors' => [
                'token' => ['Unable to reset password with the provided token.'],
            ],
        ], 422);
    }
}

