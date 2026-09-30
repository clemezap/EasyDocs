<?php

use App\Http\Controllers\ArchivoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CarpetaController;
use App\Http\Controllers\CompartirController;
use App\Http\Controllers\PapeleraController;
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

        // Compartir con otros usuarios
        Route::get('/compartidos', [CompartirController::class, 'conmigo']);
        Route::get('/archivos/{id}/compartidos', [CompartirController::class, 'listar']);
        Route::post('/archivos/{id}/compartidos', [CompartirController::class, 'agregar']);
        Route::patch('/archivos/{id}/compartidos/{compartido}', [CompartirController::class, 'cambiarPermiso']);
        Route::delete('/archivos/{id}/compartidos/{compartido}', [CompartirController::class, 'quitar']);

        // Papelera
        Route::post('/carpetas/{id}/papelera', [PapeleraController::class, 'enviarCarpeta']);
        Route::post('/archivos/{id}/papelera', [PapeleraController::class, 'enviarArchivo']);

        Route::get('/papelera', [PapeleraController::class, 'listar']);
        Route::delete('/papelera', [PapeleraController::class, 'vaciar']);
        Route::post('/papelera/carpetas/{id}/restaurar', [PapeleraController::class, 'restaurarCarpeta']);
        Route::post('/papelera/archivos/{id}/restaurar', [PapeleraController::class, 'restaurarArchivo']);
        Route::delete('/papelera/carpetas/{id}', [PapeleraController::class, 'eliminarCarpeta']);
        Route::delete('/papelera/archivos/{id}', [PapeleraController::class, 'eliminarArchivo']);
    });
});
