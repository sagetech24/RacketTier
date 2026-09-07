<?php

namespace App\Http\Controllers;

use App\Actions\ListAdminMembers;
use App\Http\Requests\ListAdminMembersRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class AdminMembersIndexController extends Controller
{
    public function index(ListAdminMembersRequest $request, ListAdminMembers $listAdminMembers): JsonResponse
    {
        $paginator = $listAdminMembers->execute($request->perPage(), $request->searchQuery());

        return UserResource::collection($paginator)->response();
    }
}
