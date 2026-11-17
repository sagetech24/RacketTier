<?php

namespace App\Http\Controllers;

use App\Actions\RestoreFacility;
use App\Http\Requests\AdminOnlyRequest;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;

class FacilityRestoreController extends Controller
{
    public function __invoke(
        AdminOnlyRequest $request,
        int $facility,
        RestoreFacility $restore,
    ): JsonResponse {
        $model = Facility::withTrashed()->findOrFail($facility);
        $restored = $restore->execute($model);
        $restored->loadCount('gameSessions');

        return response()->json([
            'data' => new FacilityResource($restored),
            'message' => 'Facility restored.',
        ]);
    }
}
