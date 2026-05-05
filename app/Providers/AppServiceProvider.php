<?php

namespace App\Providers;

use App\Models\GameSession;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::bind('gameSession', function (string $value): GameSession {
            $user = auth()->user();
            abort_if(! $user, 401);

            $session = GameSession::query()->whereKey($value)->first();
            abort_if(! $session, 404);

            $isParticipant = GameSession::query()
                ->whereKey($value)
                ->whereUserIsParticipant($user)
                ->exists();

            if ($isParticipant) {
                return $session;
            }

            // Facility game room lists every active session at a facility; allow read-only access when
            // the client scopes by facility (same check as GameSessionShowController).
            if (request()->isMethod('GET')) {
                $facilityId = request()->query('facility_id');
                if (
                    $facilityId !== null && $facilityId !== ''
                    && (int) $facilityId === (int) $session->facility_id
                    && $session->is_active
                ) {
                    return $session;
                }
            }

            abort(404);
        });
    }
}
