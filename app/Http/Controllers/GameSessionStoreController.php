<?php

namespace App\Http\Controllers;

use App\Actions\CreateGameSession;
use App\Http\Requests\StoreGameSessionRequest;
use App\Http\Resources\GameSessionResource;
use Illuminate\Http\JsonResponse;

class GameSessionStoreController extends Controller
{
    public function store(StoreGameSessionRequest $request, CreateGameSession $createGameSession): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $court = $request->validated('court_preference');

        /** @var array<int, array{user_id: int, team: int}> $teamAssignments */
        $teamAssignments = collect($request->validated('team_assignments'))
            ->map(fn (array $row): array => [
                'user_id' => (int) $row['user_id'],
                'team' => (int) $row['team'],
            ])
            ->values()
            ->all();

        $result = $createGameSession->execute(
            $user,
            (int) $request->validated('facility_id'),
            $request->validated('sport_slug'),
            $request->validated('match_type'),
            $request->validated('game_type'),
            $court !== null && $court !== '' ? $court : null,
            $teamAssignments,
        );

        $session = $result['session'];
        $session->load([
            'sport',
            'facility',
            'creator:id,name,email',
            'players' => fn ($q) => $q->orderByDesc('is_playing')->orderBy('queue_position'),
            'players.user:id,name,email',
        ]);
        $session->loadCount('players');

        return response()->json([
            'data' => new GameSessionResource($session),
        ], 201);
    }
}
