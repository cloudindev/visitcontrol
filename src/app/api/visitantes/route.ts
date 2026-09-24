/**
 * POST /api/visitantes
 *
 * Registra una visita tanto para nuevos visitantes como para visitantes recurrentes,
 * incluyendo persona visitada, parentesco, acompañantes y almacenamiento de firma digital.
 *
 * Body: {
 *   nombre: string,
 *   apellidos: string,
 *   dni: string,
 *   persona_visitada: string,
 *   parentesco: string,
 *   firma: string,
 *   acompanantes?: Array<{ dni?: string, nombre: string, apellidos: string }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateDocumento, formatDocumento } from '@/lib/validators';

interface Acompanante {
  dni?: string;
  nombre: string;
  apellidos: string;
}

interface RegistroVisitanteBody {
  nombre: string;
  apellidos: string;
  dni: string;
  persona_visitada: string;
  parentesco: string;
  firma: string;
  acompanantes?: Acompanante[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parsear y validar campos requeridos ──────────────────────────
    const body = (await request.json()) as Partial<RegistroVisitanteBody>;
    const { nombre, apellidos, dni, persona_visitada, parentesco, firma, acompanantes } = body;

    if (
      !nombre?.trim() ||
      !apellidos?.trim() ||
      !dni?.trim() ||
      !persona_visitada?.trim() ||
      !parentesco?.trim() ||
      !firma
    ) {
      return NextResponse.json(
        {
          error:
            'Todos los campos principales son obligatorios (DNI, nombre, apellidos, persona que visita, parentesco y firma)',
        },
        { status: 400 }
      );
    }

    // ── 2. Validar formato del documento ────────────────────────────────
    if (!validateDocumento(dni)) {
      return NextResponse.json(
        { error: 'Formato de documento no válido' },
        { status: 400 }
      );
    }

    // ── 3. Formatear DNI ────────────────────────────────────────────────
    const dniFormateado = formatDocumento(dni);

    // ── 4. Comprobar si el DNI ya existe ────────────────────────────────
    const { data: existente, error: errorConsulta } = await supabaseAdmin
      .from('visitantes')
      .select('id')
      .eq('dni', dniFormateado)
      .maybeSingle();

    if (errorConsulta) {
      console.error('[POST /api/visitantes] Error consultando DNI:', errorConsulta);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 5. Convertir firma base64 a Buffer y subir a storage ────────────
    const base64Data = firma.split(',')[1] ?? firma;
    const firmaBuffer = Buffer.from(base64Data, 'base64');
    const sanitizedDni = dniFormateado.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `${Date.now()}-${sanitizedDni}.png`;

    const { error: errorUpload } = await supabaseAdmin.storage
      .from('firmas')
      .upload(storagePath, firmaBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (errorUpload) {
      console.error('[POST /api/visitantes] Error subiendo firma:', errorUpload);
      return NextResponse.json(
        { error: 'Error interno del servidor al procesar la firma' },
        { status: 500 }
      );
    }

    // ── 6. Obtener o crear visitante ────────────────────────────────────
    let visitanteId: string;

    if (existente) {
      // Visitante recurrente: reutilizar ID y actualizar nombre/apellidos si han variado
      visitanteId = existente.id;
      await supabaseAdmin
        .from('visitantes')
        .update({ nombre: nombre.trim(), apellidos: apellidos.trim() })
        .eq('id', existente.id);
    } else {
      // Nuevo visitante: insertar en la tabla
      const { data: insertedVisitante, error: errorInsertVisitante } = await supabaseAdmin
        .from('visitantes')
        .insert({
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          dni: dniFormateado,
        })
        .select('id')
        .single();

      if (errorInsertVisitante || !insertedVisitante) {
        console.error('[POST /api/visitantes] Error insertando visitante:', errorInsertVisitante);
        return NextResponse.json(
          { error: 'Error interno del servidor' },
          { status: 500 }
        );
      }
      visitanteId = insertedVisitante.id;
    }

    // ── 7. Insertar visita con persona_visitada, parentesco y acompañantes ────────
    const filteredAcompanantes = Array.isArray(acompanantes)
      ? acompanantes
          .filter((ac) => ac.nombre?.trim() || ac.apellidos?.trim())
          .map((ac) => ({
            dni: ac.dni?.trim() ? formatDocumento(ac.dni) : '',
            nombre: ac.nombre?.trim() || '',
            apellidos: ac.apellidos?.trim() || '',
          }))
      : [];

    const visitaPayload: Record<string, unknown> = {
      visitante_id: visitanteId,
      firma_url: storagePath,
      acepta_terminos: true,
      persona_visitada: persona_visitada.trim(),
      parentesco: parentesco.trim(),
    };

    if (filteredAcompanantes.length > 0) {
      visitaPayload.acompanantes = filteredAcompanantes;
    }

    let { error: errorInsertVisita } = await supabaseAdmin
      .from('visitas')
      .insert(visitaPayload);

    // Fallback defensivo en caso de columnas pendientes de migración en Supabase
    if (errorInsertVisita) {
      console.warn(
        '[POST /api/visitantes] Intento con todas las columnas falló. Aplicando fallback defensivo:',
        errorInsertVisita.message
      );

      // Si falló por acompanantes, probar sin acompanantes
      if (visitaPayload.acompanantes) {
        delete visitaPayload.acompanantes;
        const retry1 = await supabaseAdmin.from('visitas').insert(visitaPayload);
        errorInsertVisita = retry1.error;
      }

      // Si sigue fallando (ej. faltan columnas persona_visitada / parentesco), usar payload mínimo
      if (errorInsertVisita) {
        const minimalPayload = {
          visitante_id: visitanteId,
          firma_url: storagePath,
          acepta_terminos: true,
        };
        const retryMinimal = await supabaseAdmin.from('visitas').insert(minimalPayload);
        errorInsertVisita = retryMinimal.error;
      }
    }

    if (errorInsertVisita) {
      console.error('[POST /api/visitantes] Error final insertando visita:', errorInsertVisita);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 8. Respuesta exitosa ────────────────────────────────────────────
    return NextResponse.json(
      { success: true, visitante_id: visitanteId },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/visitantes] Error inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
