/**
 * POST /api/visitantes/consultar
 *
 * Consulta si un visitante existe en la base de datos por DNI o por ID (UUID).
 *
 * Body: { dni?: string, id?: string }
 *   - Si se proporciona `id`, busca por UUID directamente
 *   - Si se proporciona `dni`, busca por número de documento
 *   - Al menos uno de los dos debe estar presente
 *
 * Respuestas:
 * - 200 { found: false } si no existe
 * - 200 { found: true, visitante: { id, nombre, apellidos, dni } } si existe
 *
 * Decisión técnica: se usa POST en vez de GET para evitar exponer el DNI
 * en la URL (query params) y en los logs del servidor/CDN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { formatDocumento } from '@/lib/validators';

/** Interfaz del body esperado en la petición */
interface ConsultaBody {
  dni?: string;
  id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Validar que al menos un campo de búsqueda esté presente ──────
    const body = (await request.json()) as Partial<ConsultaBody>;
    const { dni, id } = body;

    if (!dni && !id) {
      return NextResponse.json(
        { error: 'Debe proporcionar un DNI o un identificador' },
        { status: 400 }
      );
    }

    // ── 2. Construir y ejecutar la consulta ─────────────────────────────
    let query = supabaseAdmin
      .from('visitantes')
      .select('id, nombre, apellidos, dni');

    if (id) {
      // Búsqueda por UUID (usado desde la página de confirmación)
      query = query.eq('id', id);
    } else if (dni) {
      // Búsqueda por DNI formateado
      const dniFormateado = formatDocumento(dni);
      query = query.eq('dni', dniFormateado);
    }

    const { data: visitante, error: errorConsulta } = await query.maybeSingle();

    if (errorConsulta) {
      console.error('[POST /api/visitantes/consultar] Error consultando:', errorConsulta);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 3. Responder según resultado ────────────────────────────────────
    if (!visitante) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        found: true,
        visitante: {
          id: visitante.id,
          nombre: visitante.nombre,
          apellidos: visitante.apellidos,
          dni: visitante.dni,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/visitantes/consultar] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Soporta búsqueda por `id` (UUID) además de por `dni` para que la
 *   página de confirmación (/confirmar?id=UUID) pueda cargar los datos
 *   del visitante directamente sin exponer el DNI en la URL.
 *
 * - Se prioriza `id` sobre `dni` si ambos están presentes.
 *
 * - Se usa POST en lugar de GET para proteger datos sensibles (PII).
 *
 * - Se seleccionan solo id, nombre, apellidos, dni para minimizar exposición.
 *
 * - Se usa `maybeSingle()` porque la consulta puede devolver 0 o 1 resultado.
 *
 * Edge cases cubiertos:
 * - Body sin ningún campo → 400
 * - Búsqueda por UUID inexistente → 200 con { found: false }
 * - Búsqueda por DNI inexistente → 200 con { found: false }
 * - Error de Supabase → 500 genérico
 */
