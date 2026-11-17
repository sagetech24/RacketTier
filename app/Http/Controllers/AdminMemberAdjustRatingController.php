<?php

namespace App\Http\Controllers;

use App\Actions\AdjustMemberRating;
use App\Http\Requests\AdminMemberAdjustRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class AdminMemberAdjustRatingController extends Controller
{
    public function __invoke(
        AdminMemberAdjustRequest $request,
        User $user,
        AdjustMemberRating $adjust,
    ): JsonResponse {
        try {
            $result = $adjust->execute(
                $request->user(),
                $user,
                (int) $request->validated('sport_id'),
                (int) $request->validated('amount'),
                (string) $request->validated('reason'),
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $result]);
    }
}
