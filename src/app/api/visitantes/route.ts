/**
 * POST /api/visitantes
 *
 * Crea un nuevo visitante y registra su primera visita.
 *
 * Body: { nombre: string, apellidos: string, dni: string, firma: string }
 * - firma: data URL en base64 (data:image/png;base64,...)
 *
 * Flujo:
 * 1. Valida campos requeridos y formato de DNI.
 * 2. Comprueba que el DNI no exista ya en la base de datos.
 * 3. Sube la firma al bucket privado 'firmas' de Supabase Storage.
 * 4. Inserta el visitante en la tabla `visitantes`.
 * 5. Inserta la visita en la tabla `visitas` con referencia al visitante.
 *
 * Decisión técnica: se almacena solo el path del storage (no URL pública)
 * porque el bucket 'firmas' es privado. El acceso se gestionará mediante
 * signed URLs cuando sea necesario visualizar la firma.
 *
 * Edge cases cubiertos:
 * - DNI duplicado → 409 con código 'DNI_EXISTS'
 * - Firma sin prefijo base64 válido → se maneja con split genérico
 * - Fallo en upload de storage → se propaga como 500
 * - Fallo en insert de visitante/visita → se propaga como 500
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateDocumento, formatDocumento } from '@/lib/validators';

/** Interfaz del body esperado en la petición */
interface RegistroVisitanteBody {
  nombre: string;
  apellidos: string;
  dni: string;
  firma: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parsear y validar campos requeridos ──────────────────────────
    const body = (await request.json()) as Partial<RegistroVisitanteBody>;
    const { nombre, apellidos, dni, firma } = body;

    if (!nombre || !apellidos || !dni || !firma) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios (nombre, apellidos, dni, firma)' },
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

    if (existente) {
      return NextResponse.json(
        { error: 'Este documento ya está registrado', code: 'DNI_EXISTS' },
        { status: 409 }
      );
    }

    // ── 5. Convertir firma base64 a Buffer ──────────────────────────────
    // El data URL tiene formato: data:image/png;base64,<datos>
    const base64Data = firma.split(',')[1] ?? firma;
    const firmaBuffer = Buffer.from(base64Data, 'base64');

    // ── 6. Subir firma al bucket privado 'firmas' ───────────────────────
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
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 7. El storagePath es la referencia al archivo (bucket privado) ──

    // ── 8. Insertar visitante ───────────────────────────────────────────
    const { data: insertedVisitante, error: errorInsertVisitante } = await supabaseAdmin
      .from('visitantes')
      .insert({ nombre, apellidos, dni: dniFormateado })
      .select('id')
      .single();

    if (errorInsertVisitante || !insertedVisitante) {
      console.error('[POST /api/visitantes] Error insertando visitante:', errorInsertVisitante);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 9. Insertar primera visita ──────────────────────────────────────
    const { error: errorInsertVisita } = await supabaseAdmin
      .from('visitas')
      .insert({
        visitante_id: insertedVisitante.id,
        firma_url: storagePath,
        acepta_terminos: true,
      });

    if (errorInsertVisita) {
      console.error('[POST /api/visitantes] Error insertando visita:', errorInsertVisita);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 10. Respuesta exitosa ───────────────────────────────────────────
    return NextResponse.json(
      { success: true, visitante_id: insertedVisitante.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/visitantes] Error inesperado:', error);
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
 * - Se usa `maybeSingle()` en vez de `single()` para la consulta de DNI
 *   existente, porque `single()` lanza error si no encuentra resultados,
 *   mientras que `maybeSingle()` retorna `null` — que es lo esperado.
 *
 * - Se almacena solo el `storagePath` (ej: "1720828160000-12345678Z.png")
 *   en la columna `firma_url` en vez de una URL pública, porque el bucket
 *   'firmas' es privado. El frontend deberá solicitar un signed URL al
 *   servidor cuando necesite visualizar la firma.
 *
 * - El DNI se sanitiza para el nombre del archivo reemplazando caracteres
 *   especiales por guiones bajos, evitando problemas con rutas de storage.
 *
 * - Se usa `Buffer.from(base64Data, 'base64')` que es compatible con el
 *   runtime de Node.js de Next.js (no Edge).
 *
 * Edge cases cubiertos:
 * - Firma sin prefijo "data:image/png;base64," → el split(',')[1] maneja
 *   ambos casos (con o sin prefijo) gracias al fallback `?? firma`.
 * - DNI duplicado → respuesta 409 específica con código para que el
 *   frontend pueda ofrecer flujo de "visita recurrente".
 * - Errores de Supabase en cualquier paso → se logean y se devuelve 500
 *   genérico sin filtrar detalles internos al cliente.
 */
