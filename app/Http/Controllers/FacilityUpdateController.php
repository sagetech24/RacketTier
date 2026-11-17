<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateFacilityRequest;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;

class FacilityUpdateController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function __invoke(UpdateFacilityRequest $request, Facility $facility): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $facility->fill([
            'name' => $request->validated('name'),
            'address' => $request->validated('address'),
            'cover_photo' => $request->validated('cover_photo'),
        ])->save();

        $facility->loadCount('gameSessions');
        $this->referenceDataCache->forgetFacilitiesIndex();

        return response()->json([
            'data' => new FacilityResource($facility),
        ]);
    }
}
