<?php

namespace App\Http\Controllers;

use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityIndexController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $q = trim((string) $request->query('q', ''));

        $query = Facility::query()->orderBy('name')->limit(80);

        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%'.$q.'%')
                    ->orWhere('address', 'like', '%'.$q.'%');
            });
        }

        return response()->json([
            'data' => FacilityResource::collection($query->get()),
        ]);
    }
}
