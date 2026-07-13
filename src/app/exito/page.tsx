"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";

/**
 * Pantalla de Éxito.
 *
 * Se muestra tras completar exitosamente un registro o visita recurrente.
 * Incluye:
 * - Check animado con SVG
 * - Barra de progreso que se vacía en 8 segundos
 * - Auto-redirect al Home tras 8 segundos (modo kiosco)
 * - Botón manual para volver al inicio
 *
 * No se monta InactivityGuard porque esta pantalla gestiona
 * su propio timer de 8 segundos.
 */
export default function ExitoPage() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);

  /** Mostrar contenido con delay para la animación de entrada */
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /** Auto-redirect al Home tras 8 segundos */
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 8000);
    return () => clearTimeout(timer);
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <LandscapeGuard>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div
          className={`text-center max-w-lg px-8 transition-all duration-700 ${
            showContent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          {/* Logo */}
          <div className="w-24 h-24 relative mx-auto mb-8 rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/images/logo-residencial-sanesteban.png"
              alt="Logo Residencia de Mayores"
              fill
              className="object-contain bg-white"
            />
          </div>

          {/* Check animado */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
            <svg
              className="w-14 h-14 text-secondary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeDasharray="100"
                className="animate-check-draw"
              />
            </svg>
          </div>

          {/* Mensaje de éxito */}
          <h1 className="text-4xl font-bold text-primary font-serif mb-3">
            ¡Bienvenido/a!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Tus datos han sido registrados correctamente
          </p>

          {/* Barra de progreso + PROCESO FINALIZADO */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-secondary"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-500 tracking-widest uppercase">
                Proceso Finalizado
              </span>
            </div>

            {/* Barra de progreso que se vacía en 8s */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-progress-shrink" />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Redirigiendo al inicio automáticamente...
            </p>
          </div>
        </div>
      </main>
    </LandscapeGuard>
  );
}

/*
 * ─── Decisión técnica ───
 * No se usa InactivityGuard aquí porque la pantalla tiene su propio
 * timer de 8 segundos para auto-redirect. Usar ambos podría causar
 * doble redirect o interferencia.
 *
 * La animación de entrada se retrasa 100ms para que el navegador
 * tenga tiempo de pintar el fondo antes de animar el contenido.
 *
 * La barra de progreso usa la animación CSS `progress-shrink` definida
 * en globals.css (de 100% a 0% en 8s) sincronizada con el setTimeout.
 *
 * Edge cases cubiertos:
 * - Navegación manual antes de los 8s (el timer se limpia con cleanup)
 * - SSR: showContent arranca en false, se activa con useEffect
 */
