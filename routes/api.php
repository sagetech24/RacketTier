<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'service' => config('app.name'),
        'status' => 'ok',
    ]);
});

Route::get('/me', function (Request $request) {
    return response()->json([
        'message' => 'API is active.',
        'user' => $request->user(),
    ]);
});
