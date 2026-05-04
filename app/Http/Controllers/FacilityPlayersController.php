<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityPlayersController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user, 401);

        $q = trim((string) $request->query('q', ''));

        $query = User::query()
            ->whereKeyNot($user->id)
            ->orderBy('name')
            ->limit(60);

        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%');
            });
        }

        $players = $query->get(['id', 'name', 'email'])->map(fn (User $u): array => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
        ]);

        return response()->json(['data' => $players]);
    }
}
