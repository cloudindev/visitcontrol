'use client';

import Link from 'next/link';

/**
 * Props para el componente BackButton.
 * @property href - Ruta de destino. Por defecto navega a '/'.
 */
interface BackButtonProps {
  href?: string;
}

/**
 * BackButton — Componente cliente de navegación simple.
 *
 * Renderiza un enlace estilizado con icono de flecha izquierda y texto
 * 'Volver', utilizando el componente `Link` de Next.js para navegación
 * client-side optimizada con prefetching.
 *
 * @performance Componente ligero sin estado ni efectos. No requiere
 *   React.memo ya que su costo de re-render es insignificante.
 */
export default function BackButton({ href = '/' }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="text-gray-500 hover:text-[#1E40AF] transition-colors text-sm flex items-center gap-1"
      aria-label="Volver a la página anterior"
    >
      ← Volver
    </Link>
  );
}

/*
 * ── Decisiones técnicas ──────────────────────────────────────────────
 *
 * 1. Se usa el componente `Link` de Next.js en lugar de `<a>` para
 *    aprovechar la navegación client-side y el prefetching automático.
 *
 * 2. Marcado como 'use client' porque se usa como parte de la UI
 *    interactiva del kiosco y podría integrarse en layouts client.
 *
 * 3. El aria-label provee contexto accesible para lectores de pantalla,
 *    complementando el texto visual con la flecha unicode.
 *
 * Edge cases cubiertos:
 *   - href por defecto a '/' si no se proporciona.
 *   - transition-colors para feedback visual suave en hover.
 */
