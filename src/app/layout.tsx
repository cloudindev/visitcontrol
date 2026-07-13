import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Metadata SEO para la aplicación de registro de visitas.
 * Título y descripción orientados al contexto de residencia de mayores.
 */
export const metadata: Metadata = {
  title: "Registro de Visitas — Residencia de Mayores",
  description:
    "Sistema de registro de visitas para la Residencia de Mayores. Registre su visita de forma rápida y sencilla.",
  icons: {
    icon: "/images/favicon-residencial-sanesteban.png",
    apple: "/images/favicon-residencial-sanesteban.png",
  },
};

/**
 * Viewport config para modo kiosco:
 * - Deshabilitamos zoom del usuario (user-scalable=no)
 * - Scale fijo a 1 para evitar inconsistencias en tablet
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Layout raíz de la aplicación.
 * Envuelve todas las páginas con:
 * - LandscapeGuard: bloquea orientación portrait
 * - InactivityGuard: timeout de 60s para modo kiosco
 *
 * Las fuentes se cargan vía CSS @import en globals.css
 * para Playfair Display (serif) e Inter (sans-serif).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface font-sans">
        {children}
      </body>
    </html>
  );
}

/*
 * ─── Decisión técnica ───
 * Se usa CSS @import para las fuentes en lugar de next/font/google
 * porque Playfair Display + Inter requieren configuraciones de peso
 * específicas que son más limpias con el import directo en globals.css.
 *
 * LandscapeGuard e InactivityGuard se montan a nivel de cada página
 * (no en el layout) para evitar re-renders innecesarios del layout
 * completo y para permitir que la pantalla de éxito controle su propio
 * timer de auto-redirect sin interferencia del InactivityGuard.
 */
