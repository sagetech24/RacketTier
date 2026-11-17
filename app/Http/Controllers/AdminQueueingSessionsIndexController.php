<?php

namespace App\Http\Controllers;

use App\Actions\ListAdminQueueingSessions;
use App\Http\Requests\ListAdminQueueingSessionsRequest;
use App\Http\Resources\GameSessionResource;
use Illuminate\Http\JsonResponse;

class AdminQueueingSessionsIndexController extends Controller
{
    public function __invoke(
        ListAdminQueueingSessionsRequest $request,
        ListAdminQueueingSessions $list,
    ): JsonResponse {
        $paginator = $list->execute(
            $request->perPage(),
            $request->statusFilter(),
            $request->sportId(),
            $request->searchQuery(),
        );

        return GameSessionResource::collection($paginator)->response();
    }
}
