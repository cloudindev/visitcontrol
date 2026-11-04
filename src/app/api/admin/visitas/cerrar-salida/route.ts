/**
 * POST /api/admin/visitas/cerrar-salida
 *
 * Cierra la salida de una o varias visitas pendientes de forma administrativa.
 * Requiere autenticación de sesión de administrador.
 *
 * Body: { visita_ids: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarSesion } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

interface CerrarSalidaBody {
  visita_ids: string[];
}

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
    const body = (await request.json()) as Partial<CerrarSalidaBody>;
    const { visita_ids } = body;

    if (!visita_ids || !Array.isArray(visita_ids) || visita_ids.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un ID de visita a cerrar.' },
        { status: 400 }
      );
    }

    // ── 3. Actualizar fecha_salida en las visitas indicadas ───────────────
    const nowIso = new Date().toISOString();

    const { error: errorUpdate } = await supabaseAdmin
      .from('visitas')
      .update({ fecha_salida: nowIso })
      .in('id', visita_ids);

    if (errorUpdate) {
      console.error('[POST /api/admin/visitas/cerrar-salida] Error actualizando visitas:', errorUpdate);
      return NextResponse.json(
        { error: errorUpdate.message || 'Error al cerrar las visitas seleccionadas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: visita_ids.length,
      visita_ids,
      fecha_salida: nowIso,
    });
  } catch (error: unknown) {
    console.error('[POST /api/admin/visitas/cerrar-salida] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
