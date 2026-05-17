<?php

namespace App\Http\Controllers;

use App\Actions\GetUserActivity;
use App\Http\Resources\UserActivityItemResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserActivityIndexController extends Controller
{
    public function index(Request $request, GetUserActivity $getUserActivity): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'cursor' => ['nullable', 'string', 'max:512'],
        ]);

        $result = $getUserActivity->execute(
            $user,
            isset($validated['cursor']) ? (string) $validated['cursor'] : null,
            (int) ($validated['limit'] ?? 15),
        );

        return response()->json([
            'data' => UserActivityItemResource::collection($result['items']),
            'meta' => [
                'next_cursor' => $result['next_cursor'],
                'has_more' => $result['has_more'],
            ],
        ]);
    }
}
