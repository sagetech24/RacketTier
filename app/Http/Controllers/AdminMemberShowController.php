<?php

namespace App\Http\Controllers;

use App\Actions\GetAdminMemberDetail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMemberShowController extends Controller
{
    public function __invoke(Request $request, User $user, GetAdminMemberDetail $detail): JsonResponse
    {
        return response()->json([
            'data' => $detail->execute($user, $request),
        ]);
    }
}
