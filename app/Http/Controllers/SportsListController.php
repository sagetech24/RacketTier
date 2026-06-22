<?php

namespace App\Http\Controllers;

use App\Services\ReferenceDataCache;
use Illuminate\Http\JsonResponse;

class SportsListController extends Controller
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->referenceDataCache->sports()]);
    }
}
