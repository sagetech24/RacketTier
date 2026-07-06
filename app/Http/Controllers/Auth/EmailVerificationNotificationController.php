<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SendUserEmailVerification;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    public function __invoke(
        Request $request,
        SendUserEmailVerification $sendUserEmailVerification,
    ): JsonResponse {
        $user = $request->user();
        abort_if(! $user, 401);

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Your email is already verified.',
                'already_verified' => true,
            ]);
        }

        $emailSent = $sendUserEmailVerification($user);

        if (! $emailSent) {
            return response()->json([
                'message' => 'We could not send a verification email right now. Please try again in a few minutes.',
                'already_verified' => false,
                'email_sent' => false,
            ], 503);
        }

        return response()->json([
            'message' => 'A new verification link has been sent to your email address.',
            'already_verified' => false,
            'email_sent' => true,
        ]);
    }
}
