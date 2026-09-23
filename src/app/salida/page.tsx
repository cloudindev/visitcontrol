"use client";

/**
 * @file page.tsx
 * @description Pantalla para el registro de Salida (Checkout) del visitante.
 *
 * Solicita el DNI del visitante, comprueba su visita abierta y registra
 * la hora de salida de las instalaciones.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import { validateDocumento } from "@/lib/validators";
import { API_BASE } from "@/lib/api";

// ── 1. Interfaces ────────────────────────────────────────────────────────────

interface SalidaSuccessData {
  nombre: string;
  apellidos: string;
  fecha_salida: string;
  alreadyExited?: boolean;
  message?: string;
}

// ── 2. Component Logic & Render ──────────────────────────────────────────────

export default function SalidaPage() {
  const router = useRouter();

  // Estados del formulario
  const [dni, setDni] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SalidaSuccessData | null>(null);

  // Auto-redirección tras confirmación exitosa de salida (5 segundos)
  useEffect(() => {
    if (!successData) return;
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);
    return () => clearTimeout(timer);
  }, [successData, router]);

  const handleDniChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDni(e.target.value);
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanDni = dni.trim();

      if (!cleanDni) {
        setErrorMessage("Por favor, introduzca su documento de identidad.");
        return;
      }

      if (!validateDocumento(cleanDni)) {
        setErrorMessage("El formato de documento no es válido (DNI o NIE español).");
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`${API_BASE}/visitas/salida`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: cleanDni }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "No se ha podido registrar la salida.");
          return;
        }

        setSuccessData({
          nombre: data.nombre,
          apellidos: data.apellidos,
          fecha_salida: data.fecha_salida,
          alreadyExited: data.alreadyExited,
          message: data.message,
        });
      } catch (err: unknown) {
        console.error("[SalidaPage] Error en checkout:", err);
        setErrorMessage("Error de conexión con el servidor. Inténtelo de nuevo.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [dni]
  );

  return (
    <LandscapeGuard>
      <InactivityGuard>
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-8 bg-gray-50">
          {/* Logo como enlace a Home */}
          <Link href="/" className="mb-6">
            <Image
              src="/images/logo-residencial-sanesteban.png"
              alt="Logo Residencia de Mayores"
              width={90}
              height={90}
              className="rounded-2xl shadow-xs"
              priority
            />
          </Link>

          <div className="card w-full max-w-lg p-8 md:p-10 shadow-xl bg-white rounded-3xl border border-gray-150 text-center">
            {!successData ? (
              <>
                {/* Cabecera */}
                <div className="mb-8">
                  <h1 className="text-3xl md:text-5xl font-bold text-primary font-serif mb-2">
                    Registro de Salida
                  </h1>
                  <p className="text-gray-500 text-base md:text-lg">
                    Ingrese su número de documento de identidad para registrar su salida
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-6 text-left">
                    <label htmlFor="dni-salida" className="field-label mb-1.5 block">
                      DNI / Documento de Identidad
                    </label>
                    <input
                      id="dni-salida"
                      type="text"
                      value={dni}
                      onChange={handleDniChange}
                      placeholder="Ej: 12345678X"
                      className={`input-field text-lg py-3 px-4 ${
                        errorMessage ? "input-error" : ""
                      }`}
                      autoComplete="off"
                      autoFocus
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Mensaje de Error */}
                  {errorMessage && (
                    <div
                      className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm font-medium animate-fade-in-up"
                      role="alert"
                    >
                      {errorMessage}
                    </div>
                  )}

                  {/* Botón Confirmar Salida */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !dni.trim()}
                    className="btn btn-secondary w-full text-xl py-3.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Comprobando...
                      </span>
                    ) : (
                      "Confirmar Salida"
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Vista de Confirmación Exitosa */
              <div className="py-4 animate-fade-in-up">
                {/* Check Icon */}
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold shadow-inner">
                  ✓
                </div>

                <h2 className="text-3xl font-bold text-gray-800 font-serif mb-2">
                  ¡Hasta pronto, {successData.nombre}!
                </h2>

                <p className="text-gray-600 text-lg mb-6">
                  {successData.message || (
                    <>
                      Su salida ha sido registrada a las{" "}
                      <strong className="text-gray-900">
                        {new Date(successData.fecha_salida).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                      .
                    </>
                  )}
                </p>

                <p className="text-xs text-gray-400 mb-6">
                  Redirigiendo automáticamente a la pantalla de inicio...
                </p>

                <button
                  onClick={() => router.push("/")}
                  className="btn btn-primary w-full text-base py-3"
                >
                  Volver al Inicio
                </button>
              </div>
            )}
          </div>
        </main>
      </InactivityGuard>
    </LandscapeGuard>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Se aísla el flujo de salida en su propia ruta `/salida` manteniendo el
 *   mismo estándar visual de modo kiosco (LandscapeGuard e InactivityGuard).
 * - La confirmación muestra un feedback cordial de despedida que se auto-redirige
 *   a la Home tras 5 segundos para mantener el kiosco disponible para el siguiente
 *   usuario sin intervención manual.
 * - Se manejan casos en que la salida ya haya sido registrada previamente para
 *   evitar confusión en el usuario.
 *
 * Edge cases cubiertos:
 * - DNI inexistente en el sistema: 404 claro.
 * - Salida ya marcada: no bloquea ni da error 500, informa de la hora previa.
 * - Validación formal de DNI/NIE español en cliente y servidor.
 */
