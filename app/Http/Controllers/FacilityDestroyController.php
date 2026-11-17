<?php

namespace App\Http\Controllers;

use App\Actions\ArchiveFacility;
use App\Http\Requests\AdminOnlyRequest;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class FacilityDestroyController extends Controller
{
    public function __invoke(
        AdminOnlyRequest $request,
        Facility $facility,
        ArchiveFacility $archive,
    ): JsonResponse {
        try {
            $archive->execute($facility);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Facility archived.',
        ]);
    }
}
