<?php

namespace App\Http\Controllers;

use App\Http\Resources\FacilityResource;
use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityIndexController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $q = trim((string) $request->query('q', ''));

        $facilities = $q === ''
            ? $this->referenceDataCache->facilitiesIndexUnfiltered()
            : $this->referenceDataCache->buildFacilitiesQuery($q)->get();

        return response()->json([
            'data' => FacilityResource::collection($facilities),
        ]);
    }
}
