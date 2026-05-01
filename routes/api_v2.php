<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'service' => 'backend-v2',
        'version' => 'v2',
        'status' => 'ok',
    ]);
});

Route::get('/me', function (Request $request) {
    return response()->json([
        'message' => 'Backend v2 API is active.',
        'user' => $request->user(),
    ]);
});
