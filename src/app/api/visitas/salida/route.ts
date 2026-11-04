/**
 * POST /api/visitas/salida
 *
 * Endpoint con doble funcionalidad para el flujo interactivo de salida:
 * 1. accion: 'consultar' (por defecto si no se pasa confirmar: true):
 *    Recupera los datos de la visita activa (visitante principal, acompañantes, persona visitada y parentesco)
 *    para mostrar la vista de confirmación interactiva.
 * 2. accion: 'confirmar':
 *    Registra la fecha_salida y si el residente visitado también sale del centro (residente_sale).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateDocumento, formatDocumento } from '@/lib/validators';

interface SalidaBody {
  dni: string;
  accion?: 'consultar' | 'confirmar';
  visita_id?: string;
  residente_sale?: boolean;
  personas_salida?: Array<{
    tipo: 'principal' | 'acompanante' | 'residente';
    nombre: string;
    apellidos?: string;
    dni?: string;
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<SalidaBody>;
    const { dni, accion = 'consultar', visita_id, residente_sale = false, personas_salida } = body;

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
    let query = supabaseAdmin
      .from('visitas')
      .select('*')
      .eq('visitante_id', visitante.id);

    if (visita_id) {
      query = query.eq('id', visita_id);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: rawVisita, error: errorVisita } = await query.maybeSingle();

    if (errorVisita) {
      console.error('[POST /api/visitas/salida] Error consultando visita:', errorVisita);
      return NextResponse.json(
        { error: errorVisita.message || 'Error al consultar la visita' },
        { status: 500 }
      );
    }

    if (!rawVisita) {
      return NextResponse.json(
        { error: 'No consta ninguna visita registrada para este documento' },
        { status: 404 }
      );
    }

    // Si ya tenía salida registrada y estamos en modo consultar
    if (rawVisita.fecha_salida && accion === 'consultar') {
      const fechaSalidaDate = new Date(rawVisita.fecha_salida);
      const horaStr = fechaSalidaDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return NextResponse.json({
        success: true,
        alreadyExited: true,
        nombre: visitante.nombre,
        apellidos: visitante.apellidos,
        fecha_salida: rawVisita.fecha_salida,
        message: `La salida de esta visita ya fue registrada a las ${horaStr}.`,
      });
    }

    // ── 3. Si la acción es 'consultar', retornar datos para la pantalla intermedia ──
    if (accion === 'consultar') {
      return NextResponse.json({
        success: true,
        alreadyExited: false,
        visita_id: rawVisita.id,
        visitante: {
          id: visitante.id,
          nombre: visitante.nombre,
          apellidos: visitante.apellidos,
          dni: visitante.dni,
        },
        acompanantes: Array.isArray(rawVisita.acompanantes) ? rawVisita.acompanantes : [],
        persona_visitada: rawVisita.persona_visitada || null,
        parentesco: rawVisita.parentesco || null,
        created_at: rawVisita.created_at,
      });
    }

    // ── 4. Si la acción es 'confirmar', registrar la salida ───────────────
    const nowIso = new Date().toISOString();

    // 4.1 Intentar registrar fecha_salida y residente_sale
    let { error: errorUpdate } = await supabaseAdmin
      .from('visitas')
      .update({
        fecha_salida: nowIso,
        residente_sale: Boolean(residente_sale),
      })
      .eq('id', rawVisita.id);

    // 4.2 Fallback defensivo si residente_sale no existe aún en Supabase:
    // Al menos no bloquear la salida del visitante
    if (errorUpdate) {
      console.warn(
        '[POST /api/visitas/salida] Falló update con residente_sale (' +
          errorUpdate.message +
          '). Reintentando solo con fecha_salida:'
      );
      const retry = await supabaseAdmin
        .from('visitas')
        .update({ fecha_salida: nowIso })
        .eq('id', rawVisita.id);
      if (retry.error) {
        console.error('[POST /api/visitas/salida] Error en fallback de fecha_salida:', retry.error);
      }
    }

    return NextResponse.json({
      success: true,
      alreadyExited: false,
      visita_id: rawVisita.id,
      nombre: visitante.nombre,
      apellidos: visitante.apellidos,
      fecha_salida: nowIso,
      residente_sale: Boolean(residente_sale),
      persona_visitada: rawVisita.persona_visitada || null,
      personas_salida: personas_salida || [],
    });
  } catch (error: unknown) {
    console.error('[POST /api/visitas/salida] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
