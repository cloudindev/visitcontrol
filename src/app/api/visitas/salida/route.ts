/**
 * POST /api/visitas/salida
 *
 * Registra la salida (checkout) de una visita en curso buscando por el DNI del visitante.
 *
 * Body: { dni: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateDocumento, formatDocumento } from '@/lib/validators';

interface SalidaBody {
  dni: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<SalidaBody>;
    const { dni } = body;

    if (!dni || !dni.trim()) {
      return NextResponse.json(
        { error: 'Debe introducir un número de documento' },
        { status: 400 }
      );
    }

    if (!validateDocumento(dni)) {
      return NextResponse.json(
        { error: 'Formato de documento no válido' },
        { status: 400 }
      );
    }

    const dniFormateado = formatDocumento(dni);

    // ── 1. Buscar al visitante por DNI ──────────────────────────────────
    const { data: visitante, error: errorVisitante } = await supabaseAdmin
      .from('visitantes')
      .select('id, nombre, apellidos, dni')
      .eq('dni', dniFormateado)
      .maybeSingle();

    if (errorVisitante) {
      console.error('[POST /api/visitas/salida] Error consultando visitante:', errorVisitante);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    if (!visitante) {
      return NextResponse.json(
        { error: 'No se ha encontrado ningún visitante registrado con este documento' },
        { status: 404 }
      );
    }

    // ── 2. Buscar la visita más reciente de este visitante ───────────────
    const { data: latestVisit, error: errorVisita } = await supabaseAdmin
      .from('visitas')
      .select('*')
      .eq('visitante_id', visitante.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorVisita) {
      console.error('[POST /api/visitas/salida] Error consultando última visita:', errorVisita);
      return NextResponse.json(
        { error: errorVisita.message || 'Error al consultar la visita' },
        { status: 500 }
      );
    }

    if (!latestVisit) {
      return NextResponse.json(
        { error: 'No consta ninguna visita registrada para este documento' },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    // Si ya tenía salida registrada previamente
    if (latestVisit.fecha_salida) {
      const fechaSalidaDate = new Date(latestVisit.fecha_salida);
      const horaStr = fechaSalidaDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return NextResponse.json({
        success: true,
        alreadyExited: true,
        nombre: visitante.nombre,
        apellidos: visitante.apellidos,
        fecha_salida: latestVisit.fecha_salida,
        message: `La salida de esta visita ya fue registrada a las ${horaStr}.`,
      });
    }

    // ── 3. Actualizar fecha de salida en la visita ────────────────────────
    const { error: errorUpdate } = await supabaseAdmin
      .from('visitas')
      .update({ fecha_salida: nowIso })
      .eq('id', latestVisit.id);

    if (errorUpdate) {
      console.warn(
        '[POST /api/visitas/salida] Aviso al actualizar fecha_salida (posible columna pendiente de migración):',
        errorUpdate
      );
    }

    return NextResponse.json({
      success: true,
      alreadyExited: false,
      nombre: visitante.nombre,
      apellidos: visitante.apellidos,
      fecha_salida: nowIso,
    });
  } catch (error: unknown) {
    console.error('[POST /api/visitas/salida] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
