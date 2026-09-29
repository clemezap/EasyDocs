<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/estado', function () {
    return response()->json([
        'app' => config('app.name'),
        'estado' => 'ok',
    ]);
});

// Rutas con sesión por cookie (frontend y API comparten origen)
Route::middleware('web')->group(function () {
    Route::get('/sesion', [AuthController::class, 'sesion']);
    Route::post('/registro', [AuthController::class, 'registro']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('autenticado')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
