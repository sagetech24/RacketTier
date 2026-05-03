<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\DashboardSummaryController;
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
    Route::view('/create-match', 'app');
    Route::view('/ranking', 'app');
    Route::view('/game-room', 'app');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
