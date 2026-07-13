/**
 * Prefijo base para todas las llamadas fetch a la API.
 *
 * Next.js aplica basePath automáticamente a <Link> y router.push(),
 * pero NO a las llamadas fetch() nativas. Este módulo centraliza
 * el prefijo para evitar duplicación y errores.
 *
 * @example
 * import { API_BASE } from '@/lib/api';
 * fetch(`${API_BASE}/visitantes/consultar`, { ... })
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Prefijo completo para endpoints API: "{basePath}/api" */
export const API_BASE = `${basePath}/api`;
