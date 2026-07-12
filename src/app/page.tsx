"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";

/**
 * Pantalla de Bienvenida (Home).
 *
 * Punto de entrada del kiosco. Ofrece dos flujos:
 * 1. Primera visita → /registro
 * 2. Visitante recurrente → /consulta
 *
 * No se monta InactivityGuard aquí porque esta ES la pantalla destino
 * del timeout de inactividad.
 */
export default function HomePage() {
  const router = useRouter();

  return (
    <LandscapeGuard>
      <main className="relative min-h-screen">
        {/* ── Imagen de fondo a pantalla completa ── */}
        <Image
          src="/images/header-residencial-sanesteban.jpg"
          alt="Residencia de Mayores — Vista del jardín"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay oscuro suave para legibilidad */}
        <div className="absolute inset-0 bg-black/20" />

        {/* ── Tarjeta flotante centrada sobre la imagen ── */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6 py-8">
          <div className="card w-full max-w-xl p-12 flex flex-col items-center text-center shadow-2xl">
            {/* Logo */}
            <div className="w-28 h-28 relative mb-6 rounded-2xl overflow-hidden shadow-md">
              <Image
                src="/images/logo-residencial-sanesteban.png"
                alt="Logo Residencia de Mayores"
                fill
                className="object-contain bg-white"
                priority
              />
            </div>

            {/* Título y subtítulo */}
            <h1 className="text-[65px] leading-tight font-bold text-primary font-serif mb-2">
              Bienvenido/a
            </h1>
            <p className="text-lg text-gray-500 mb-10">
              Por favor registra tu visita
            </p>

            {/* Botones de acción */}
            <div className="w-full flex flex-col gap-4">
              <button
                id="btn-primera-visita"
                onClick={() => router.push("/registro")}
                className="btn btn-primary w-full text-xl"
              >
                Es mi primera visita
                <span aria-hidden="true">→</span>
              </button>

              <button
                id="btn-visita-recurrente"
                onClick={() => router.push("/consulta")}
                className="btn btn-secondary w-full text-xl"
              >
                Ya me he registrado anteriormente
              </button>
            </div>
          </div>
        </div>
      </main>
    </LandscapeGuard>
  );
}

/*
 * ─── Decisión técnica ───
 * La tarjeta se desplaza -mt-24 para solaparse con la imagen de cabecera,
 * creando el efecto de "tarjeta flotante" descrito en los requisitos.
 *
 * Se usa next/image con priority para LCP optimization en la cabecera.
 * Los botones tienen min-height de 56px (via clase .btn) para
 * facilitar la interacción táctil a usuarios mayores.
 */
