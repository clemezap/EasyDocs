<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CarpetaController extends Controller
{
    /**
     * Contenido de una carpeta (o de la raíz si no se manda ?carpeta=).
     * Devuelve la carpeta actual, la ruta desde la raíz, sus subcarpetas y sus archivos.
     */
    public function contenido(Request $request): JsonResponse
    {
        $usuarioId = $this->usuarioId($request);
        $carpetaId = $request->query('carpeta') ?: null;

        $carpeta = null;
        $ruta = [];

        if ($carpetaId !== null) {
            $carpeta = $this->carpetaActiva($carpetaId, $usuarioId);

            if (! $carpeta) {
                return $this->noEncontrado('La carpeta no existe.');
            }

            $ruta = $this->ruta($carpetaId, $usuarioId);
        }

        [$filtroPadre, $parametrosPadre] = $this->filtroPadre($carpetaId);

        $carpetas = DB::select(
            "SELECT id, nombre, creado_en, actualizado_en
             FROM carpetas
             WHERE usuario_id = ? AND $filtroPadre AND papelera = 0
             ORDER BY nombre",
            [$usuarioId, ...$parametrosPadre]
        );

        $archivos = DB::select(
            "SELECT id, nombre, tipo_mime, tamano, creado_en, actualizado_en
             FROM archivos
             WHERE usuario_id = ? AND $filtroPadre AND papelera = 0
             ORDER BY nombre",
            [$usuarioId, ...$parametrosPadre]
        );

        return response()->json([
            'carpeta' => $carpeta,
            'ruta' => $ruta,
            'carpetas' => $carpetas,
            'archivos' => $archivos,
        ]);
    }

    public function crear(Request $request): JsonResponse
    {
        $usuarioId = $this->usuarioId($request);

        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'carpeta_padre' => ['nullable', 'string'],
        ], $this->mensajes());

        $nombre = trim($datos['nombre']);
        $padreId = $datos['carpeta_padre'] ?? null;

        if ($nombre === '') {
            return $this->errorValidacion('nombre', 'El nombre es obligatorio.');
        }

        if ($padreId !== null && ! $this->carpetaActiva($padreId, $usuarioId)) {
            return $this->noEncontrado('La carpeta donde quieres crearla no existe.');
        }

        if ($this->nombreRepetido($nombre, $padreId, $usuarioId)) {
            return $this->errorValidacion('nombre', 'Ya existe una carpeta con ese nombre aquí.');
        }

        $id = (string) Str::uuid7();

        DB::insert(
            'INSERT INTO carpetas (id, usuario_id, carpeta_padre, nombre) VALUES (?, ?, ?, ?)',
            [$id, $usuarioId, $padreId, $nombre]
        );

        return response()->json(['carpeta' => $this->carpetaActiva($id, $usuarioId)], 201);
    }

    public function renombrar(Request $request, string $id): JsonResponse
    {
        $usuarioId = $this->usuarioId($request);
        $carpeta = $this->carpetaActiva($id, $usuarioId);

        if (! $carpeta) {
            return $this->noEncontrado('La carpeta no existe.');
        }

        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
        ], $this->mensajes());

        $nombre = trim($datos['nombre']);

        if ($nombre === '') {
            return $this->errorValidacion('nombre', 'El nombre es obligatorio.');
        }

        if ($this->nombreRepetido($nombre, $carpeta->carpeta_padre, $usuarioId, $id)) {
            return $this->errorValidacion('nombre', 'Ya existe una carpeta con ese nombre aquí.');
        }

        DB::update(
            'UPDATE carpetas SET nombre = ? WHERE id = ? AND usuario_id = ?',
            [$nombre, $id, $usuarioId]
        );

        return response()->json(['carpeta' => $this->carpetaActiva($id, $usuarioId)]);
    }

    /**
     * Carpetas desde la raíz hasta la carpeta indicada (para la barra de navegación).
     * Sube por carpeta_padre con una consulta recursiva.
     */
    private function ruta(string $carpetaId, int $usuarioId): array
    {
        return DB::select(
            'WITH RECURSIVE ruta AS (
                SELECT id, nombre, carpeta_padre, 0 AS nivel
                FROM carpetas
                WHERE id = ? AND usuario_id = ?
                UNION ALL
                SELECT c.id, c.nombre, c.carpeta_padre, r.nivel + 1
                FROM carpetas c
                JOIN ruta r ON c.id = r.carpeta_padre
            )
            SELECT id, nombre FROM ruta ORDER BY nivel DESC',
            [$carpetaId, $usuarioId]
        );
    }

    private function nombreRepetido(string $nombre, ?string $padreId, int $usuarioId, ?string $excluirId = null): bool
    {
        [$filtroPadre, $parametrosPadre] = $this->filtroPadre($padreId);

        $sql = "SELECT id FROM carpetas
                WHERE usuario_id = ? AND $filtroPadre AND papelera = 0 AND nombre = ?";
        $parametros = [$usuarioId, ...$parametrosPadre, $nombre];

        if ($excluirId !== null) {
            $sql .= ' AND id <> ?';
            $parametros[] = $excluirId;
        }

        return DB::selectOne($sql, $parametros) !== null;
    }

    private function mensajes(): array
    {
        return [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.max' => 'El nombre no puede tener más de 255 caracteres.',
        ];
    }
}
