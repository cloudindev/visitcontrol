"use client";

/**
 * @file page.tsx
 * @description Pantalla de Bienvenida (Home) del sistema de control de visitas.
 *
 * Punto de entrada del quiosco interactivo. Ofrece:
 * 1. Acceso a ENTRADA (/registro)
 * 2. Acceso a SALIDA (/salida)
 * 3. Rotación de imágenes de fondo (crossfade cada 15 segundos)
 * 4. Soporte para modo Pantalla Completa (Kiosk Mode) con activación al interactuar
 *    o mediante botón de control en la esquina superior.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";

/** Las imágenes de fondo que se alternan cada 15 segundos */
const BACKGROUND_IMAGES = [
  "/images/header-residencial-sanesteban.jpg",
  "/images/header-residencial-sanesteban-1.jpg",
  "/images/header-residencial-sanesteban-2.jpg",
] as const;

/** Intervalo de alternancia en milisegundos (15s) */
const SWAP_INTERVAL_MS = 15_000;

interface ExtendedDocument extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
}

interface ExtendedHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export default function HomePage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ── Rotación de imágenes de fondo ──────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, SWAP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // ── Detector de estado de Pantalla Completa ────────────────────────────────
  useEffect(() => {
    const checkFullscreenState = () => {
      const doc = document as ExtendedDocument;
      const isFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", checkFullscreenState);
    document.addEventListener("webkitfullscreenchange", checkFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenState);
      document.removeEventListener("webkitfullscreenchange", checkFullscreenState);
    };
  }, []);

  /**
   * Intenta entrar en modo pantalla completa sin bloquear si el navegador lo restringe
   */
  const requestKioskFullscreen = useCallback(async () => {
    try {
      const doc = document as ExtendedDocument;
      const docEl = document.documentElement as ExtendedHTMLElement;

      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
    } catch {
      // Ignorar si el navegador restringe la llamada por política de usuario
    }
  }, []);

  /**
   * Alternar pantalla completa de forma explícita
   */
  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as ExtendedDocument;
      const docEl = document.documentElement as ExtendedHTMLElement;

      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
    } catch (err: unknown) {
      console.warn("[HomePage] No se pudo alternar pantalla completa:", err);
    }
  }, []);

  // Manejadores de navegación hacia Entrada y Salida
  const handleGoEntrada = useCallback(() => {
    void requestKioskFullscreen();
    router.push("/registro");
  }, [requestKioskFullscreen, router]);

  const handleGoSalida = useCallback(() => {
    void requestKioskFullscreen();
    router.push("/salida");
  }, [requestKioskFullscreen, router]);

  return (
    <LandscapeGuard>
      <main className="relative min-h-screen">
        {/* ── Botón discreto para activar/desactivar Pantalla Completa en Quiosco ── */}
        <div className="absolute top-4 right-4 z-30">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white/90 text-xs font-medium backdrop-blur-md transition-all active:scale-95 shadow-sm border border-white/20 cursor-pointer"
            title={isFullscreen ? "Salir de pantalla completa" : "Poner a pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Poner a pantalla completa"}
          >
            {isFullscreen ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9L4 4m0 0l5 0m-5 0l0 5m11-5l5 5m0-5l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5m11 5l5-5m0 5l-5 0m5 0l0-5"
                  />
                </svg>
                <span>Restaurar</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
                <span>Pantalla completa</span>
              </>
            )}
          </button>
        </div>

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
          <div className="relative flex flex-col items-center w-full max-w-xl">
            {/* Card principal */}
            <div className="card w-full pt-8 pb-10 px-12 flex flex-col items-center text-center shadow-2xl">
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
              <p className="text-lg text-gray-500 mb-10">
                Por favor registre su visita
              </p>

              {/* Botones de acción */}
              <div className="w-full flex flex-col gap-4">
                <button
                  id="btn-entrada"
                  onClick={handleGoEntrada}
                  className="btn btn-primary w-full text-2xl font-bold tracking-wide py-4 shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  ENTRADA
                </button>

                <button
                  id="btn-salida"
                  onClick={handleGoSalida}
                  className="btn btn-secondary w-full text-2xl font-bold tracking-wide py-4 shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  SALIDA
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </LandscapeGuard>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Soporte PWA / Kiosk Mode: se añade botón discreto para activar pantalla
 *   completa (HTML5 Fullscreen API) y se enlaza la llamada en los botones
 *   de ENTRADA y SALIDA para aprovechar el gesto del usuario requerido por
 *   los navegadores modernos (Safari/Chrome).
 * - Rotación de fondo mediante crossfade con imágenes superpuestas
 *   para garantizar un rendimiento fluido sin parpadeos ni reflows.
 * - TypeScript estricto: cero uso de `any`, con extensiones tipadas para
 *   ExtendedDocument y ExtendedHTMLElement con soporte WebKit.
 *
 * Edge cases cubiertos:
 * - Navegadores móviles o navegadores web que rechazan requestFullscreen():
 *   manejado con catch silencioso para que la navegación a /registro o /salida
 *   nunca se vea interrumpida.
 */
