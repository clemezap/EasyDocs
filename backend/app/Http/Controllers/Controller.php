<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Id del usuario con sesión iniciada.
     */
    protected function usuarioId(Request $request): int
    {
        return $request->session()->get('usuario')['id'];
    }

    /**
     * Error de validación con el mismo formato que usa Laravel (422).
     */
    protected function errorValidacion(string $campo, string $mensaje): JsonResponse
    {
        return response()->json([
            'message' => $mensaje,
            'errors' => [$campo => [$mensaje]],
        ], 422);
    }

    protected function noEncontrado(string $mensaje): JsonResponse
    {
        return response()->json(['message' => $mensaje], 404);
    }
}
