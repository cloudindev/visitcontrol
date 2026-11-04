/**
 * @file route.ts
 * @description POST /api/admin/visitas/cerrar-regreso-residente
 *
 * Registra el reingreso/regreso al centro de residentes que habían salido
 * con una visita. Permite marcar uno o múltiples residentes como regresados.
 * Requiere autenticación de sesión de administrador.
 *
 * Body: { visita_ids: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarSesion } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

interface CerrarRegresoBody {
  visita_ids: string[];
}

/**
 * Endpoint de mutación administrativa para registrar el regreso de residentes.
 * @param request NextRequest con JSON { visita_ids: string[] }
 * @returns NextResponse con resultado de la operación
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Verificar autenticación de administrador ─────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!verificarSesion(token)) {
      return NextResponse.json(
        { error: 'No autorizado. Sesión no válida.' },
        { status: 401 }
      );
    }

    // ── 2. Validar payload ──────────────────────────────────────────────
    const body = (await request.json()) as Partial<CerrarRegresoBody>;
    const { visita_ids } = body;

    if (!visita_ids || !Array.isArray(visita_ids) || visita_ids.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un ID de visita para marcar el regreso del residente.' },
        { status: 400 }
      );
    }

    // ── 3. Actualizar estado de regreso del residente en Supabase ─────────
    const nowIso = new Date().toISOString();

    const { error: errorUpdate } = await supabaseAdmin
      .from('visitas')
      .update({
        residente_regresado: true,
        fecha_regreso_residente: nowIso,
      })
      .in('id', visita_ids);

    if (errorUpdate) {
      console.error('[POST /api/admin/visitas/cerrar-regreso-residente] Error actualizando visitas:', errorUpdate);
      return NextResponse.json(
        { error: errorUpdate.message || 'Error al registrar el regreso de los residentes seleccionados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: visita_ids.length,
      visita_ids,
      fecha_regreso_residente: nowIso,
    });
  } catch (error: unknown) {
    console.error('[POST /api/admin/visitas/cerrar-regreso-residente] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
