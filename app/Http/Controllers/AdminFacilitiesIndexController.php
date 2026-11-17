<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListAdminFacilitiesRequest;
use App\Http\Resources\FacilityResource;
use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;

class AdminFacilitiesIndexController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function __invoke(ListAdminFacilitiesRequest $request): JsonResponse
    {
        $q = $request->searchQuery();
        $includeArchived = $request->includeArchived();

        $query = $this->referenceDataCache->buildFacilitiesQuery($q);

        if ($includeArchived) {
            $query->withTrashed();
        }

        return response()->json([
            'data' => FacilityResource::collection($query->get()),
        ]);
    }
}
