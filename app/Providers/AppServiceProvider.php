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

            return GameSession::query()
                ->whereKey($value)
                ->whereUserIsParticipant($user)
                ->firstOrFail();
        });
    }
}
