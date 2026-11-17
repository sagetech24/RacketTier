<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFacilityRequest;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;

class FacilityStoreController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function store(StoreFacilityRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $facility = Facility::query()->create([
            'name' => $request->validated('name'),
            'address' => $request->validated('address'),
            'cover_photo' => $request->validated('cover_photo'),
            'created_by' => $user->id,
        ]);

        $this->referenceDataCache->forgetFacilitiesIndex();

        return response()->json([
            'data' => new FacilityResource($facility),
        ], 201);
    }
}
