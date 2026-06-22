<?php

namespace App\Http\Controllers;

use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;

class PublicStatsController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->referenceDataCache->publicStats(),
        ]);
    }
}
