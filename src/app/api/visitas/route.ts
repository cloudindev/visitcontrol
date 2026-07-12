/**
 * POST /api/visitas
 *
 * Registra una nueva visita para un visitante ya existente.
 *
 * Body: { visitante_id: string, firma: string, acepta_terminos: boolean }
 * - firma: data URL en base64 (data:image/png;base64,...)
 * - acepta_terminos: debe ser true para proceder
 *
 * Flujo:
 * 1. Valida campos requeridos y que acepta_terminos sea true.
 * 2. Sube la firma al bucket privado 'firmas' de Supabase Storage.
 * 3. Inserta la visita en la tabla `visitas`.
 *
 * Decisión técnica: el nombre del archivo en storage usa visitante_id
 * en vez de DNI para evitar una consulta extra a la tabla visitantes.
 *
 * Edge cases cubiertos:
 * - acepta_terminos = false → 400, no se permite registrar sin aceptar
 * - visitante_id inválido → Supabase rechazará el FK, se captura como 500
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/** Interfaz del body esperado en la petición */
interface NuevaVisitaBody {
  visitante_id: string;
  firma: string;
  acepta_terminos: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Validar campos requeridos ────────────────────────────────────
    const body = (await request.json()) as Partial<NuevaVisitaBody>;
    const { visitante_id, firma, acepta_terminos } = body;

    if (!visitante_id || !firma || acepta_terminos === undefined || acepta_terminos === null) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios (visitante_id, firma, acepta_terminos)' },
        { status: 400 }
      );
    }

    if (acepta_terminos !== true) {
      return NextResponse.json(
        { error: 'Debe aceptar los términos y condiciones para continuar' },
        { status: 400 }
      );
    }

    // ── 2. Convertir firma base64 a Buffer ──────────────────────────────
    const base64Data = firma.split(',')[1] ?? firma;
    const firmaBuffer = Buffer.from(base64Data, 'base64');

    // ── 3. Subir firma al bucket privado 'firmas' ───────────────────────
    const storagePath = `${Date.now()}-${visitante_id}.png`;

    const { error: errorUpload } = await supabaseAdmin.storage
      .from('firmas')
      .upload(storagePath, firmaBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (errorUpload) {
      console.error('[POST /api/visitas] Error subiendo firma:', errorUpload);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 4. Insertar visita ──────────────────────────────────────────────
    const { error: errorInsertVisita } = await supabaseAdmin
      .from('visitas')
      .insert({
        visitante_id,
        firma_url: storagePath,
        acepta_terminos,
      });

    if (errorInsertVisita) {
      console.error('[POST /api/visitas] Error insertando visita:', errorInsertVisita);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }

    // ── 5. Respuesta exitosa ────────────────────────────────────────────
    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/visitas] Error inesperado:', error);
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
 * - Se valida explícitamente que `acepta_terminos === true` (comparación
 *   estricta) en vez de solo comprobar truthiness, porque es un requisito
 *   legal que el visitante acepte activamente los términos.
 *
 * - El nombre del archivo en storage usa `visitante_id` en vez de DNI para
 *   evitar una consulta adicional a la tabla visitantes y porque el ID es
 *   inherentemente seguro para usarse en rutas de archivos.
 *
 * - No se importa `validateDocumento` ni `formatDocumento` porque este
 *   endpoint opera con un visitante ya registrado (cuyo DNI ya fue validado
 *   y formateado en el registro inicial).
 *
 * - La integridad referencial (visitante_id debe existir en visitantes)
 *   se delega a la FK de la base de datos. Si el ID no existe, Supabase
 *   devolverá un error que se captura como 500.
 *
 * Edge cases cubiertos:
 * - acepta_terminos enviado como false → 400 con mensaje claro
 * - acepta_terminos no enviado (undefined/null) → 400 por campo faltante
 * - visitante_id inexistente → fallo de FK en Supabase → 500
 * - Firma sin prefijo data URL → split(',')[1] con fallback `?? firma`
 */
