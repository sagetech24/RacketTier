<?php

namespace App\Http\Controllers;

use App\Models\Sport;
use Illuminate\Http\JsonResponse;

class SportsListController extends Controller
{
    public function index(): JsonResponse
    {
        $sports = Sport::query()
            ->orderBy('id')
            ->get(['id', 'slug', 'name', 'code', 'icon']);

        return response()->json(['data' => $sports]);
    }
}
