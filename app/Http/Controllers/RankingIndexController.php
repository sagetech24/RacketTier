<?php

namespace App\Http\Controllers;

use App\Actions\GetSportRankings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RankingIndexController extends Controller
{
    public function __construct(
        private GetSportRankings $getSportRankings,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sport_id' => ['nullable', 'integer', 'exists:sports,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $payload = $this->getSportRankings->execute(
            isset($validated['sport_id']) ? (int) $validated['sport_id'] : null,
            isset($validated['search']) ? (string) $validated['search'] : '',
            (int) ($validated['limit'] ?? 50),
            $request->user(),
        );

        return response()->json($payload);
    }
}
