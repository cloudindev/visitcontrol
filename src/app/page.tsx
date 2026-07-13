"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";

/** Las dos imágenes de fondo que se alternan cada 30 segundos */
const BACKGROUND_IMAGES = [
  "/images/header-residencial-sanesteban.jpg",
  "/images/header-residencial-sanesteban-1.jpg",
  "/images/header-residencial-sanesteban-2.jpg",
] as const;

/** Intervalo de alternancia en milisegundos (30s) */
const SWAP_INTERVAL_MS = 15_000;

/**
 * Pantalla de Bienvenida (Home).
 *
 * Punto de entrada del kiosco. Ofrece dos flujos:
 * 1. Primera visita → /registro
 * 2. Visitante recurrente → /consulta
 *
 * Las imágenes de fondo se alternan cada 30 segundos con un fundido
 * cruzado (crossfade) de 1.5s usando transición CSS de opacidad.
 *
 * No se monta InactivityGuard aquí porque esta ES la pantalla destino
 * del timeout de inactividad.
 */
export default function HomePage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, SWAP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <LandscapeGuard>
      <main className="relative min-h-screen">
        {/* ── Imágenes de fondo con crossfade ── */}
        {BACKGROUND_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={`Residencia de Mayores — Vista ${index + 1}`}
            fill
            className={`object-cover transition-opacity duration-[1500ms] ease-in-out ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={index === 0}
          />
        ))}
        {/* Overlay oscuro suave para legibilidad */}
        <div className="absolute inset-0 bg-black/20" />

        {/* ── Tarjeta flotante centrada sobre la imagen ── */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6 py-8">
          <div className="card w-full max-w-xl pt-8 pb-12 px-12 flex flex-col items-center text-center shadow-2xl">
            {/* Logo */}
            <div className="w-28 h-28 relative mb-2 rounded-2xl overflow-hidden">
              <Image
                src="/images/logo-residencial-sanesteban.png"
                alt="Logo Residencia de Mayores"
                fill
                className="object-contain bg-white"
                priority
              />
            </div>

            {/* Título y subtítulo */}
            <h1 className="text-4xl md:text-[65px] leading-tight font-bold text-primary font-serif mb-1">
              Bienvenido/a
            </h1>
            <p className="text-lg text-gray-500 mb-12">
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
 * Crossfade implementado con dos <Image> superpuestos (position: absolute
 * via fill) alternando opacity 0/1 con transition-opacity de 1.5s.
 *
 * Se evita montar/desmontar imágenes para que ambas estén precargadas
 * en memoria y la transición sea instantánea sin parpadeos.
 *
 * Solo la primera imagen tiene priority para optimizar LCP.
 */
