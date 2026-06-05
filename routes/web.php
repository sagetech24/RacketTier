<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\UserPasswordUpdateController;
use App\Http\Controllers\Auth\UserProfileUpdateController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\DashboardSummaryController;
use App\Http\Controllers\FacilityGameRoomController;
use App\Http\Controllers\FacilityIndexController;
use App\Http\Controllers\FacilityPlayersController;
use App\Http\Controllers\FacilityStoreController;
use App\Http\Controllers\FacilityUpdateController;
use App\Http\Controllers\GameSessionFinishMatchController;
use App\Http\Controllers\GameSessionIndexController;
use App\Http\Controllers\GameSessionShowController;
use App\Http\Controllers\GameSessionStartMatchController;
use App\Http\Controllers\GameSessionStoreController;
use App\Http\Controllers\PublicStatsController;
use App\Http\Controllers\QueueingGameSessionEndController;
use App\Http\Controllers\QueueingGameSessionHistoryController;
use App\Http\Controllers\QueueingGameSessionStoreController;
use App\Http\Controllers\QueueingGameSessionSummaryController;
use App\Http\Controllers\QueueingGameSessionUpdateController;
use App\Http\Controllers\QueueingSessionAutoProposalsController;
use App\Http\Controllers\QueueingSessionMatchDestroyController;
use App\Http\Controllers\QueueingSessionMatchesIndexController;
use App\Http\Controllers\QueueingSessionMatchesStoreController;
use App\Http\Controllers\QueueingSessionMatchStartController;
use App\Http\Controllers\QueueingSessionMatchUpdateController;
use App\Http\Controllers\QueueingSessionPlayersDestroyController;
use App\Http\Controllers\QueueingSessionPlayersStoreController;
use App\Http\Controllers\QueueingSessionPlayersUpdateController;
use App\Http\Controllers\RankingIndexController;
use App\Http\Controllers\SportsListController;
use App\Http\Controllers\UserActivityIndexController;
use App\Http\Resources\UserResource;
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

Route::get('/public/stats', [PublicStatsController::class, 'show'])->name('public.stats');

Route::get('/auth/user', function () {
    $user = auth()->user();

    return response()->json([
        'user' => $user ? new UserResource($user) : null,
    ]);
})->name('auth.user');

Route::get('/auth/dashboard-summary', [DashboardSummaryController::class, 'show'])
    ->middleware('auth')
    ->name('auth.dashboard-summary');

Route::middleware('guest')->group(function () {
    Route::view('/login', 'app')->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');

    Route::view('/register', 'app')->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register.store');

    // Password reset (React SPA pages + JSON endpoints)
    Route::view('/forgot-password', 'app')->name('password.forgot');
    Route::post('/auth/password/forgot', PasswordResetLinkController::class)->name('auth.password.forgot');
    Route::view('/password/reset/{token}', 'app')->name('password.reset');
    Route::post('/auth/password/reset', PasswordResetController::class)->name('auth.password.reset');
});

Route::middleware('auth')->group(function () {
    Route::patch('/auth/user', UserProfileUpdateController::class)->name('auth.user.update');
    Route::patch('/auth/user/password', UserPasswordUpdateController::class)->name('auth.user.password.update');

    Route::view('/verify-email', 'app')->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');
    Route::post('/email/verification-notification', EmailVerificationNotificationController::class)
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::view('/dashboard', 'app')->name('dashboard');
    Route::view('/facilities', 'app');
    Route::view('/ranking', 'app');
    Route::view('/activity', 'app');
    Route::view('/profile', 'app');
    Route::view('/facility/{facility}/game-room', 'app')->whereNumber('facility');
    Route::view('/facility/{facility}/create-match', 'app')->whereNumber('facility');
    Route::view('/queueing-session', 'app');
    Route::view('/queueing-session/new', 'app');
    Route::view('/queueing-session/history', 'app');
    Route::view('/queueing-session/{id}', 'app')->whereNumber('id');
    Route::view('/queueing-session/{id}/matches', 'app')->whereNumber('id');
    Route::view('/queueing-session/{id}/players', 'app')->whereNumber('id');

    Route::get('/auth/sports', [SportsListController::class, 'index'])->name('auth.sports');
    Route::get('/auth/rankings', [RankingIndexController::class, 'index'])->name('auth.rankings');
    Route::get('/auth/facilities', [FacilityIndexController::class, 'index'])->name('auth.facilities.index');
    Route::get('/auth/facilities/{facility}/game-room', [FacilityGameRoomController::class, 'index'])
        ->name('auth.facilities.game-room');
    Route::post('/auth/facilities', [FacilityStoreController::class, 'store'])->name('auth.facilities.store');
    Route::patch('/auth/facilities/{facility}', FacilityUpdateController::class)->name('auth.facilities.update');
    Route::get('/auth/facility-players', [FacilityPlayersController::class, 'index'])->name('auth.facility-players');
    Route::get('/auth/game-sessions', [GameSessionIndexController::class, 'index'])->name('auth.game-sessions.index');
    Route::get('/auth/activity', [UserActivityIndexController::class, 'index'])->name('auth.activity.index');
    Route::get('/auth/game-sessions/{gameSession}', [GameSessionShowController::class, 'show'])->name('auth.game-sessions.show');
    Route::post('/auth/game-sessions/{gameSession}/start-match', GameSessionStartMatchController::class)
        ->name('auth.game-sessions.start-match');
    Route::post('/auth/game-sessions/{gameSession}/finish-match', GameSessionFinishMatchController::class)
        ->name('auth.game-sessions.finish-match');
    Route::post('/auth/game-sessions', [GameSessionStoreController::class, 'store'])->name('auth.game-sessions.store');

    Route::get('/auth/queueing-sessions/history', QueueingGameSessionHistoryController::class)
        ->name('auth.queueing-sessions.history');
    Route::post('/auth/queueing-sessions', [QueueingGameSessionStoreController::class, 'store'])->name('auth.queueing-sessions.store');
    Route::patch('/auth/queueing-sessions/{gameSession}', QueueingGameSessionUpdateController::class)
        ->name('auth.queueing-sessions.update');
    Route::post('/auth/queueing-sessions/{gameSession}/players', [QueueingSessionPlayersStoreController::class, 'store'])
        ->name('auth.queueing-sessions.players.store');
    Route::patch('/auth/queueing-sessions/{gameSession}/players/{gameSessionPlayer}', QueueingSessionPlayersUpdateController::class)
        ->name('auth.queueing-sessions.players.update');
    Route::delete('/auth/queueing-sessions/{gameSession}/players/{gameSessionPlayer}', QueueingSessionPlayersDestroyController::class)
        ->name('auth.queueing-sessions.players.destroy');
    Route::post('/auth/queueing-sessions/{gameSession}/end', QueueingGameSessionEndController::class)
        ->name('auth.queueing-sessions.end');
    Route::get('/auth/queueing-sessions/{gameSession}/summary', QueueingGameSessionSummaryController::class)
        ->name('auth.queueing-sessions.summary');
    Route::get('/auth/queueing-sessions/{gameSession}/matches', QueueingSessionMatchesIndexController::class)
        ->name('auth.queueing-sessions.matches.index');
    Route::get('/auth/queueing-sessions/{gameSession}/matches/auto-proposals', QueueingSessionAutoProposalsController::class)
        ->name('auth.queueing-sessions.matches.auto-proposals');
    Route::post('/auth/queueing-sessions/{gameSession}/matches', QueueingSessionMatchesStoreController::class)
        ->name('auth.queueing-sessions.matches.store');
    Route::post('/auth/queueing-sessions/{gameSession}/matches/{queueingSessionMatch}/start', QueueingSessionMatchStartController::class)
        ->name('auth.queueing-sessions.matches.start');
    Route::patch('/auth/queueing-sessions/{gameSession}/matches/{queueingSessionMatch}', QueueingSessionMatchUpdateController::class)
        ->name('auth.queueing-sessions.matches.update');
    Route::delete('/auth/queueing-sessions/{gameSession}/matches/{queueingSessionMatch}', QueueingSessionMatchDestroyController::class)
        ->name('auth.queueing-sessions.matches.destroy');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
