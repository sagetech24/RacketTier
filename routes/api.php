<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v2')->middleware('api.version:v2')->group(base_path('routes/api_v2.php'));
