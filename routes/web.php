<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\DashboardSummaryController;
use App\Http\Controllers\FacilityGameRoomController;
use App\Http\Controllers\FacilityIndexController;
use App\Http\Controllers\FacilityPlayersController;
use App\Http\Controllers\FacilityStoreController;
use App\Http\Controllers\GameSessionIndexController;
use App\Http\Controllers\GameSessionShowController;
use App\Http\Controllers\GameSessionStoreController;
use App\Http\Controllers\SportsListController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| React SPA (resources/js) — web session + Sanctum-compatible same-origin
|--------------------------------------------------------------------------
|
| `view('app')` is only the Blade shell; all UI is React. POST routes are
| called via fetch/postForm from the SPA. Do not add server-rendered pages
| here—use JSON endpoints in routes/api.php for non-auth API surface.
|--------------------------------------------------------------------------
*/

Route::view('/', 'app')->name('home');

Route::get('/auth/user', function () {
    return response()->json(['user' => auth()->user()]);
})->name('auth.user');

Route::get('/auth/dashboard-summary', [DashboardSummaryController::class, 'show'])
    ->middleware('auth')
    ->name('auth.dashboard-summary');

Route::middleware('guest')->group(function () {
    Route::view('/login', 'app')->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');

    Route::view('/register', 'app')->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register.store');
});

Route::middleware('auth')->group(function () {
    Route::view('/dashboard', 'app')->name('dashboard');
    Route::view('/facilities', 'app');
    Route::view('/ranking', 'app');
    Route::view('/facility/{facility}/game-room', 'app')->whereNumber('facility');
    Route::view('/facility/{facility}/create-match', 'app')->whereNumber('facility');

    Route::get('/auth/sports', [SportsListController::class, 'index'])->name('auth.sports');
    Route::get('/auth/facilities', [FacilityIndexController::class, 'index'])->name('auth.facilities.index');
    Route::get('/auth/facilities/{facility}/game-room', [FacilityGameRoomController::class, 'index'])
        ->name('auth.facilities.game-room');
    Route::post('/auth/facilities', [FacilityStoreController::class, 'store'])->name('auth.facilities.store');
    Route::get('/auth/facility-players', [FacilityPlayersController::class, 'index'])->name('auth.facility-players');
    Route::get('/auth/game-sessions', [GameSessionIndexController::class, 'index'])->name('auth.game-sessions.index');
    Route::get('/auth/game-sessions/{gameSession}', [GameSessionShowController::class, 'show'])->name('auth.game-sessions.show');
    Route::post('/auth/game-sessions', [GameSessionStoreController::class, 'store'])->name('auth.game-sessions.store');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
