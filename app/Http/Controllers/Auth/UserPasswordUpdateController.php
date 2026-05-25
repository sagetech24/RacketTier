<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateUserPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserPasswordUpdateController extends Controller
{
    public function __invoke(UpdateUserPasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        $request->session()?->regenerate();

        return response()->json([
            'message' => 'Password updated.',
        ]);
    }
}
