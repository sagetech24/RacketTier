<?php

namespace App\Http\Controllers;

use App\Actions\ListAdminTierRanks;
use App\Http\Requests\ListAdminTierRanksRequest;
use Illuminate\Http\JsonResponse;

class AdminTierRanksIndexController extends Controller
{
    public function __invoke(
        ListAdminTierRanksRequest $request,
        ListAdminTierRanks $list,
    ): JsonResponse {
        return response()->json([
            'data' => $list->execute($request->sportId()),
        ]);
    }
}
