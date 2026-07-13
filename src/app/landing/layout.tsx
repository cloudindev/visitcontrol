import type { Metadata, Viewport } from "next";

/**
 * Layout independiente para la landing page pública de VisitControl.
 * No hereda estilos de kiosco (LandscapeGuard, InactivityGuard, etc.).
 * Usa Hanken Grotesk para headlines e Inter para body/labels.
 */
export const metadata: Metadata = {
  title: "VisitControl — Sistema de Gestión de Visitas para empresas",
  description:
    "Optimiza la recepción de tu empresa, mejora la seguridad y ofrece una experiencia impecable a tus visitantes con nuestra plataforma de última generación.",
  icons: {
    icon: "/images/favicon-residencial-sanesteban.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
