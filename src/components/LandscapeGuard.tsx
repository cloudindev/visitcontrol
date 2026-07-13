'use client';

import { useState, useEffect } from 'react';

/**
 * Props para el componente LandscapeGuard.
 * @property children - Contenido que se renderiza solo en orientación landscape.
 */
interface LandscapeGuardProps {
  children: React.ReactNode;
}

/**
 * LandscapeGuard — Componente cliente que detecta la orientación de pantalla.
 *
 * En orientación portrait muestra un overlay a pantalla completa con una
 * animación pidiendo al usuario que gire la tablet. En landscape renderiza
 * los children directamente.
 *
 * Maneja SSR de forma segura: por defecto asume landscape (sin overlay)
 * y sincroniza en el primer montaje con `window.matchMedia`.
 *
 * @performance Sin re-renders innecesarios: el listener de matchMedia
 *   solo se dispara cuando la orientación cambia, no en cada frame.
 *
 * Edge cases cubiertos:
 *   - SSR: no accede a `window` fuera de useEffect.
 *   - Dispositivos que no soportan matchMedia (fallback a landscape).
 *   - Limpieza del listener al desmontar el componente.
 */
export default function LandscapeGuard({ children }: LandscapeGuardProps) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const orientationQuery = window.matchMedia('(orientation: portrait)');
    /** Solo bloqueamos portrait en pantallas ≥768px (tablets). Móviles pasan. */
    const tabletQuery = window.matchMedia('(min-width: 768px)');

    /** Sincroniza el estado con la orientación y tamaño del dispositivo. */
    const update = () => {
      setIsPortrait(orientationQuery.matches);
      setIsTablet(tabletQuery.matches);
    };

    // Lectura inicial
    update();

    // Escuchar cambios
    orientationQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);

    return () => {
      orientationQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
    };
  }, []);

  if (isPortrait && isTablet) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1E40AF] text-white px-8"
        role="alert"
        aria-live="assertive"
      >
        {/* Icono SVG de rotación de dispositivo */}
        <div className="animate-pulse mb-8">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Contorno del dispositivo (tablet/teléfono) rotado */}
            <rect
              x="30"
              y="20"
              width="60"
              height="80"
              rx="8"
              ry="8"
              stroke="white"
              strokeWidth="3"
              fill="none"
            />
            {/* Pantalla interior */}
            <rect
              x="36"
              y="30"
              width="48"
              height="56"
              rx="2"
              ry="2"
              fill="rgba(255,255,255,0.15)"
            />
            {/* Botón home / indicador inferior */}
            <circle cx="60" cy="95" r="3" fill="white" opacity="0.6" />
            {/* Flecha de rotación curva */}
            <path
              d="M95 55 C 105 30, 85 10, 60 12"
              stroke="white"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <polygon points="58,6 60,14 52,12" fill="white" />
            <path
              d="M25 65 C 15 90, 35 110, 60 108"
              stroke="white"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <polygon points="62,114 60,106 68,108" fill="white" />
          </svg>
        </div>

        <p className="text-2xl font-bold text-center leading-snug max-w-md">
          Por favor, gira la tablet a posición horizontal
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/*
 * ── Decisiones técnicas ──────────────────────────────────────────────
 *
 * 1. Se usa `matchMedia('(orientation: portrait)')` en vez de comparar
 *    `innerWidth` vs `innerHeight` porque es la API estándar y dispara
 *    eventos solo cuando la orientación realmente cambia, evitando
 *    re-renders innecesarios por redimensionamiento de ventana.
 *
 * 2. El SVG es inline para evitar una petición HTTP adicional y para
 *    poder controlar colores y animaciones con CSS/Tailwind.
 *
 * 3. `role="alert"` y `aria-live="assertive"` garantizan que lectores
 *    de pantalla anuncien la instrucción de rotación inmediatamente.
 *
 * 4. El estado inicial es `false` (landscape) para que en SSR no se
 *    renderice el overlay, evitando flash de contenido incorrecto.
 *
 * Edge cases cubiertos:
 *   - Navegadores sin soporte de matchMedia (fallback a landscape).
 *   - SSR (no accede a window fuera de useEffect).
 *   - Cleanup del listener al desmontar.
 */
