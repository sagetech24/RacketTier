<?php

namespace App\Http\Controllers;

use App\Http\Resources\GameSessionResource;
use App\Models\GameSession;
use App\Services\QueueingSessionDraftHydrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GameSessionIndexController extends Controller
{
    public function __construct(
        private QueueingSessionDraftHydrator $draftHydrator,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $validated = $request->validate([
            'facility_id' => ['sometimes', 'integer', 'exists:facilities,id'],
            'session_context' => ['sometimes', 'string', 'in:facility,queueing'],
        ]);

        $isAdminQueueingBrowse = $user->isAdmin()
            && ($validated['session_context'] ?? null) === 'queueing';

        $query = GameSession::query()
            ->where('is_active', true)
            ->when(
                ! $isAdminQueueingBrowse,
                fn ($q) => $q->whereUserIsParticipant($user),
            )
            ->when(
                isset($validated['facility_id']),
                fn ($q) => $q->where('facility_id', $validated['facility_id']),
            )
            ->when(
                isset($validated['session_context']),
                fn ($q) => $q->where('session_context', $validated['session_context']),
            )
            ->with(['sport', 'facility', 'creator:id,name,email'])
            ->withCount('players')
            ->orderByDesc('updated_at')
            ->limit($isAdminQueueingBrowse ? 100 : 25);

        $sessions = $query->get();
        $this->draftHydrator->applyListCounts($sessions);

        $payload = [
            'data' => GameSessionResource::collection($sessions)->toArray($request),
        ];

        if (($validated['session_context'] ?? null) === 'queueing') {
            $tz = (string) config('app.timezone');
            $startOfToday = Carbon::now($tz)->startOfDay();
            $endOfToday = Carbon::now($tz)->endOfDay();

            $finishedToday = GameSession::query()
                ->where('session_context', 'queueing')
                ->where('is_active', false)
                ->when(
                    ! $user->isAdmin(),
                    fn ($q) => $q->whereUserIsParticipant($user),
                )
                ->whereBetween('ended_at', [$startOfToday, $endOfToday])
                ->with(['sport', 'facility', 'creator:id,name,email'])
                ->withCount('players')
                ->orderByDesc('ended_at')
                ->orderByDesc('updated_at')
                ->limit($user->isAdmin() ? 100 : 25)
                ->get();

            $this->draftHydrator->applyListCounts($finishedToday);

            $payload['finished_today'] = GameSessionResource::collection($finishedToday)->toArray($request);
        }

        return response()->json($payload);
    }
}
