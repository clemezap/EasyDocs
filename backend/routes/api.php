<?php

use App\Http\Controllers\ArchivoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CarpetaController;
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

        Route::get('/carpetas/contenido', [CarpetaController::class, 'contenido']);
        Route::post('/carpetas', [CarpetaController::class, 'crear']);
        Route::patch('/carpetas/{id}', [CarpetaController::class, 'renombrar']);

        Route::post('/archivos', [ArchivoController::class, 'subir']);
        Route::get('/archivos/{id}/descargar', [ArchivoController::class, 'descargar']);
        Route::patch('/archivos/{id}', [ArchivoController::class, 'renombrar']);
    });
});
