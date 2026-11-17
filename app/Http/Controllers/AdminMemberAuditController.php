<?php

namespace App\Http\Controllers;

use App\Actions\GetAdminMemberAudit;
use App\Http\Requests\AdminMemberAuditRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminMemberAuditController extends Controller
{
    public function __invoke(
        AdminMemberAuditRequest $request,
        User $user,
        GetAdminMemberAudit $audit,
    ): JsonResponse {
        return response()->json([
            'data' => $audit->execute(
                $user,
                $request->sportId(),
                $request->limit(),
            ),
        ]);
    }
}
