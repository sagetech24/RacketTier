<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendPasswordResetLinkRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class PasswordResetLinkController extends Controller
{
    public function __invoke(SendPasswordResetLinkRequest $request): JsonResponse
    {
        // Always return a generic response to prevent account enumeration.
        Password::sendResetLink($request->validated());

        return response()->json([
            'message' => 'If your email exists, we sent a password reset link.',
        ]);
    }
}

