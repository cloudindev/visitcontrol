'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Props para el componente InactivityGuard.
 * @property children  - Contenido envuelto por el guard de inactividad.
 * @property timeoutMs - Milisegundos de inactividad antes de redirigir. Default: 60000 (60s).
 */
interface InactivityGuardProps {
  children: React.ReactNode;
  timeoutMs?: number;
}

/** Eventos del DOM que se consideran "actividad del usuario". */
const ACTIVITY_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
  'touchstart',
  'touchmove',
  'mousedown',
  'mousemove',
  'keydown',
];

/**
 * InactivityGuard — Componente cliente que detecta inactividad y redirige al home.
 *
 * Envuelve a sus children de forma transparente. Si el usuario no interactúa
 * con el dispositivo durante `timeoutMs` milisegundos, redirige a '/' usando
 * el router de Next.js. No redirige si ya se encuentra en '/'.
 *
 * @performance Usa un solo setTimeout (no setInterval) con reinicio en cada
 *   evento de actividad. Los listeners se registran con `{ passive: true }`
 *   para no bloquear el scroll touch. La referencia al timer se gestiona
 *   con useRef para evitar re-renders.
 *
 * Edge cases cubiertos:
 *   - No redirige si el pathname actual es '/'.
 *   - Cleanup completo de timer y listeners al desmontar.
 *   - Estable ante cambios de ruta: recalcula el pathname en cada reset.
 */
export default function InactivityGuard({
  children,
  timeoutMs = 60_000,
}: InactivityGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Limpia el timer existente y programa uno nuevo.
   * Solo redirige si el pathname actual NO es '/'.
   */
  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (pathname !== '/') {
        router.push('/');
      }
    }, timeoutMs);
  }, [pathname, timeoutMs, router]);

  useEffect(() => {
    // Arrancar el timer al montar
    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    // Registrar listeners de actividad
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      // Limpiar timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      // Limpiar listeners
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [resetTimer]);

  return <>{children}</>;
}

/*
 * ── Decisiones técnicas ──────────────────────────────────────────────
 *
 * 1. Se usa `useRef` para el timer en lugar de estado, porque no necesitamos
 *    provocar re-renders cuando el timer cambia.
 *
 * 2. Los eventos de actividad incluyen tanto `touch*` como `mouse*` porque
 *    el kiosco usa tablets pero podría conectarse un ratón/teclado externo.
 *
 * 3. `{ passive: true }` en los listeners para no degradar el rendimiento
 *    del scroll nativo en dispositivos táctiles.
 *
 * 4. Se lee `pathname` dentro del callback del timer (a través del closure
 *    de `resetTimer` que se recrea cuando `pathname` cambia) para garantizar
 *    que la condición de "no redirigir si ya estamos en '/'" siempre use
 *    el valor más reciente.
 *
 * 5. ACTIVITY_EVENTS es un array readonly constante fuera del componente
 *    para evitar recrearlo en cada render.
 *
 * Edge cases cubiertos:
 *   - Pathname ya es '/': no redirige.
 *   - Desmontaje durante countdown: timer limpiado.
 *   - Eventos rápidos sucesivos: solo el último timeout sobrevive.
 */
