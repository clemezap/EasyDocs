<?php

use Illuminate\Support\Facades\Route;

Route::get('/estado', function () {
    return response()->json([
        'app' => config('app.name'),
        'estado' => 'ok',
    ]);
});
