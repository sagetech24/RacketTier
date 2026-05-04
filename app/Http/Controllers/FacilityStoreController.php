<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFacilityRequest;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;

class FacilityStoreController extends Controller
{
    public function store(StoreFacilityRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $facility = Facility::query()->create([
            'name' => $request->validated('name'),
            'address' => $request->validated('address'),
            'created_by' => $user->id,
        ]);

        return response()->json([
            'data' => new FacilityResource($facility),
        ], 201);
    }
}
