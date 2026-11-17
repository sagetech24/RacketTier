<?php

namespace App\Http\Controllers;

use App\Actions\UpdateTierRank;
use App\Http\Requests\UpdateTierRankRequest;
use App\Models\TierRank;
use Illuminate\Http\JsonResponse;

class AdminTierRankUpdateController extends Controller
{
    public function __invoke(
        UpdateTierRankRequest $request,
        TierRank $tierRank,
        UpdateTierRank $update,
    ): JsonResponse {
        $tier = $update->execute($tierRank, $request->validated());

        return response()->json([
            'data' => [
                'id' => (int) $tier->id,
                'sport_id' => (int) $tier->sport_id,
                'sport_name' => $tier->sport?->name,
                'tier_no' => (int) $tier->tier_no,
                'name' => (string) $tier->name,
                'start_point' => (int) $tier->start_point,
                'end_point' => (int) $tier->end_point,
                'status' => (bool) $tier->status,
            ],
            'message' => 'Tier updated.',
        ]);
    }
}
