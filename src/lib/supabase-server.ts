/**
 * @file supabase-server.ts
 * @description Cliente Supabase del lado del servidor con Service Role Key.
 *
 * ⚠️ IMPORTANTE: Este módulo está diseñado EXCLUSIVAMENTE para uso en Route Handlers
 * de Next.js (app/api/...). NUNCA importar en componentes del cliente ni en Server Components
 * que rendericen HTML, ya que expone la Service Role Key que bypasea RLS.
 *
 * @example
 * ```ts
 * // En un Route Handler: app/api/visitas/route.ts
 * import { supabaseAdmin } from '@/lib/supabase-server';
 *
 * export async function POST(request: Request) {
 *   const { data, error } = await supabaseAdmin
 *     .from('visitas')
 *     .insert({ ... });
 * }
 * ```
 *
 * @module lib/supabase-server
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Validación en tiempo de ejecución de las variables de entorno requeridas.
 * Lanza un error descriptivo si alguna falta, evitando fallos silenciosos
 * en producción.
 */
const supabaseUrl: string = (() => {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      '[supabase-server] Falta la variable de entorno SUPABASE_URL. ' +
        'Asegúrate de configurarla en .env.local o en el entorno de despliegue.'
    );
  }
  return url;
})();

const supabaseServiceKey: string = (() => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      '[supabase-server] Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY. ' +
        'Asegúrate de configurarla en .env.local o en el entorno de despliegue.'
    );
  }
  return key;
})();

/**
 * Cliente Supabase con privilegios de administrador (Service Role).
 *
 * Este cliente bypasea Row Level Security (RLS) y tiene acceso completo
 * a todas las tablas. Úsalo solo en contextos seguros del servidor.
 *
 * @remarks
 * - No se persisten sesiones de autenticación (`persistSession: false`)
 *   porque este cliente opera sin contexto de usuario.
 * - `autoRefreshToken` está deshabilitado ya que la Service Role Key
 *   no expira como un JWT de usuario.
 *
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Decisiones técnicas:
 * - Se usan IIFEs para validar variables de entorno en lugar de non-null assertions (!)
 *   para obtener errores descriptivos en tiempo de ejecución en vez de `undefined` silenciosos.
 * - `persistSession: false` y `autoRefreshToken: false` porque el Service Role Key
 *   no requiere gestión de sesión y opera como credencial estática.
 *
 * Edge cases cubiertos:
 * - Variables de entorno ausentes: Error explícito con mensaje descriptivo.
 * - Importación accidental en el cliente: La ausencia de variables de entorno
 *   del servidor en el bundle del cliente provocará el error descriptivo.
 */
