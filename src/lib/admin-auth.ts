/**
 * @file admin-auth.ts
 * @description Utilidades para verificar la autenticación del panel de administración.
 *
 * Utiliza un esquema de firma sin estado basado en hashes SHA-256 para validar
 * la sesión de administración utilizando variables de entorno y el secreto de Supabase.
 */

import { createHash } from 'crypto';

/**
 * Obtiene las credenciales de administración desde las variables de entorno
 * o utiliza valores seguros por defecto en caso de no estar definidas.
 */
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SanEsteban2026!';

/**
 * Genera el token de sesión esperado para validar la cookie de autenticación.
 *
 * @returns El hash SHA-256 de las credenciales firmadas con la Service Role Key.
 */
export function generarTokenSesion(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secret_fallback';
  return createHash('sha256')
    .update(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${secret}`)
    .digest('hex');
}

/**
 * Verifica si el valor de la cookie de sesión es válido.
 *
 * @param token - El valor de la cookie de sesión.
 * @returns true si el token es válido, false en caso contrario.
 */
export function verificarSesion(token: string | undefined): boolean {
  if (!token) return false;
  const tokenEsperado = generarTokenSesion();
  return token === tokenEsperado;
}
