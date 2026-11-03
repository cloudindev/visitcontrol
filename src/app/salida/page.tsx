"use client";

/**
 * @file page.tsx
 * @description Pantalla para el registro de Salida (Checkout) del visitante.
 *
 * Flujo:
 * 1. Paso 'input': El visitante introduce su NIF/DNI y pulsa 'Continuar'.
 * 2. Paso 'confirm': Se muestra la vista con tarjetas horizontales:
 *    - Zona superior 'Salida de visitas' (drop zone): persona principal y acompañantes.
 *    - Zona inferior 'Incluya a todas las personas que realizan la salida del centro':
 *      tarjeta del residente visitado ('persona que visita' + parentesco) arrastrable
 *      (o clicable) hacia arriba para marcar que el residente sale también de las instalaciones.
 * 3. Paso 'success': Confirmación con detalle de todas las personas salientes y auto-redirect a Home.
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

interface AcompananteItem {
  dni?: string;
  nombre: string;
  apellidos: string;
}

interface VisitaActiva {
  visita_id: string;
  visitante: {
    id: string;
    nombre: string;
    apellidos: string;
    dni: string;
  };
  acompanantes: AcompananteItem[];
  persona_visitada: string | null;
  parentesco: string | null;
  created_at: string;
}

interface SalidaSuccessData {
  nombre: string;
  apellidos: string;
  fecha_salida: string;
  alreadyExited?: boolean;
  message?: string;
  residente_sale?: boolean;
  persona_visitada?: string | null;
}

type SalidaStep = "input" | "confirm" | "success";

// ── 2. Component Logic & Render ──────────────────────────────────────────────

export default function SalidaPage() {
  const router = useRouter();

  // Estados del flujo
  const [step, setStep] = useState<SalidaStep>("input");
  const [dni, setDni] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Datos de la visita activa
  const [visitaActiva, setVisitaActiva] = useState<VisitaActiva | null>(null);

  // Estado de si el residente sale del centro
  const [residenteSale, setResidenteSale] = useState<boolean>(false);
  const [isDropActive, setIsDropActive] = useState<boolean>(false);

  // Datos tras confirmación
  const [successData, setSuccessData] = useState<SalidaSuccessData | null>(null);

  // Auto-redirección tras confirmación exitosa (5 segundos)
  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);
    return () => clearTimeout(timer);
  }, [step, router]);

  const handleDniChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDni(e.target.value);
    setErrorMessage(null);
  }, []);

  /** Paso 1: Consultar la visita activa */
  const handleConsultarVisita = useCallback(
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

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`${API_BASE}/visitas/salida`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dni: cleanDni,
            accion: "consultar",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "No se ha encontrado ninguna visita activa.");
          return;
        }

        // Si ya tenía salida registrada previamente
        if (data.alreadyExited) {
          setSuccessData({
            nombre: data.nombre,
            apellidos: data.apellidos,
            fecha_salida: data.fecha_salida,
            alreadyExited: true,
            message: data.message,
          });
          setStep("success");
          return;
        }

        // Cargar visita y pasar al paso de confirmación
        setVisitaActiva({
          visita_id: data.visita_id,
          visitante: data.visitante,
          acompanantes: data.acompanantes || [],
          persona_visitada: data.persona_visitada || null,
          parentesco: data.parentesco || null,
          created_at: data.created_at,
        });
        setResidenteSale(false);
        setStep("confirm");
      } catch (err: unknown) {
        console.error("[SalidaPage] Error consultando visita:", err);
        setErrorMessage("Error de conexión con el servidor. Inténtelo de nuevo.");
      } finally {
        setIsLoading(false);
      }
    },
    [dni]
  );

  /** Paso 2: Confirmar la salida definitiva con los datos seleccionados */
  const handleConfirmarSalida = useCallback(async () => {
    if (!visitaActiva) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Construir listado de todas las personas que salen
      const personasSalida: Array<{
        tipo: "principal" | "acompanante" | "residente";
        nombre: string;
        apellidos?: string;
        dni?: string;
      }> = [
        {
          tipo: "principal",
          nombre: visitaActiva.visitante.nombre,
          apellidos: visitaActiva.visitante.apellidos,
          dni: visitaActiva.visitante.dni,
        },
        ...visitaActiva.acompanantes.map((ac) => ({
          tipo: "acompanante" as const,
          nombre: ac.nombre,
          apellidos: ac.apellidos,
          dni: ac.dni,
        })),
      ];

      if (residenteSale && visitaActiva.persona_visitada) {
        personasSalida.push({
          tipo: "residente",
          nombre: visitaActiva.persona_visitada,
        });
      }

      const res = await fetch(`${API_BASE}/visitas/salida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: visitaActiva.visitante.dni,
          visita_id: visitaActiva.visita_id,
          accion: "confirmar",
          residente_sale: residenteSale,
          personas_salida: personasSalida,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "No se ha podido confirmar la salida.");
        return;
      }

      setSuccessData({
        nombre: data.nombre,
        apellidos: data.apellidos,
        fecha_salida: data.fecha_salida,
        residente_sale: data.residente_sale,
        persona_visitada: data.persona_visitada,
      });
      setStep("success");
    } catch (err: unknown) {
      console.error("[SalidaPage] Error confirmando salida:", err);
      setErrorMessage("Error de conexión al confirmar la salida. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [visitaActiva, residenteSale]);

  // Manejadores de Drag and Drop
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", "residente");
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDropActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
    const data = e.dataTransfer.getData("text/plain");
    if (data === "residente") {
      setResidenteSale(true);
    }
  }, []);

  return (
    <LandscapeGuard>
      <InactivityGuard>
        <main className="min-h-screen flex flex-col items-center justify-start px-6 py-6 md:py-8 bg-gray-50">
          {/* Logo como enlace a Home */}
          <Link href="/" className="mb-4">
            <Image
              src="/images/logo-residencial-sanesteban.png"
              alt="Logo Residencia de Mayores"
              width={85}
              height={85}
              className="rounded-2xl shadow-xs"
              priority
            />
          </Link>

          {/* ════════════════════════════════════════════════════════════════
              PASO 1: Formulario de entrada de DNI / NIF
             ════════════════════════════════════════════════════════════════ */}
          {step === "input" && (
            <div className="card w-full max-w-lg p-8 md:p-10 shadow-xl bg-white rounded-3xl border border-gray-150 text-center animate-fade-in-up">
              <div className="mb-8">
                <h1 className="text-3xl md:text-5xl font-bold text-primary font-serif mb-2">
                  Registro de Salida
                </h1>
                <p className="text-gray-500 text-base md:text-lg">
                  Ingrese su NIF para registrar su salida.
                </p>
              </div>

              <form onSubmit={handleConsultarVisita} noValidate>
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
                    disabled={isLoading}
                  />
                </div>

                {errorMessage && (
                  <div
                    className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm font-medium animate-fade-in-up"
                    role="alert"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !dni.trim()}
                  className="btn btn-secondary w-full text-xl py-3.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
                    "Continuar"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              PASO 2: Confirmación Interactiva con Cards Horizontales
             ════════════════════════════════════════════════════════════════ */}
          {step === "confirm" && visitaActiva && (
            <div className="card w-full max-w-5xl p-6 md:p-8 shadow-xl bg-white rounded-3xl border border-gray-150 animate-fade-in-up">
              {/* Cabecera */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-150 pb-4">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-primary font-serif">
                    Salida de visitas
                  </h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Entrada registrada a las{" "}
                    <strong className="text-gray-700">
                      {new Date(visitaActiva.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-xs text-gray-500 hover:text-gray-700 underline font-medium self-start sm:self-center"
                >
                  ← Cambiar documento
                </button>
              </div>

              {/* ── ÁREA SUPERIOR (DROP ZONE): Personas salientes ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <span>🚪</span> Personas que abandonan las instalaciones:
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {1 +
                      visitaActiva.acompanantes.length +
                      (residenteSale ? 1 : 0)}{" "}
                    saliente(s)
                  </span>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`min-h-[140px] p-4 rounded-2xl border-2 transition-all duration-200 flex flex-wrap gap-4 items-center ${
                    isDropActive
                      ? "border-primary bg-blue-50/70 shadow-inner scale-[1.01]"
                      : "border-gray-200 bg-gray-50/80"
                  }`}
                >
                  {/* Tarjeta Visitante Principal */}
                  <div className="flex-1 min-w-[220px] max-w-[280px] bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">👤</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Principal
                        </span>
                      </div>
                      <p className="font-bold text-gray-800 text-base leading-snug">
                        {visitaActiva.visitante.nombre}{" "}
                        {visitaActiva.visitante.apellidos}
                      </p>
                      <p className="text-xs font-mono text-gray-500 mt-1">
                        DNI: {visitaActiva.visitante.dni}
                      </p>
                    </div>
                  </div>

                  {/* Tarjetas de Acompañantes */}
                  {visitaActiva.acompanantes.map((ac, idx) => (
                    <div
                      key={idx}
                      className="flex-1 min-w-[220px] max-w-[280px] bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">👥</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Acompañante #{idx + 1}
                          </span>
                        </div>
                        <p className="font-bold text-gray-800 text-base leading-snug">
                          {ac.nombre} {ac.apellidos}
                        </p>
                        {ac.dni ? (
                          <p className="text-xs font-mono text-gray-500 mt-1">
                            DNI: {ac.dni}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {/* Tarjeta del Residente (si fue incluido) */}
                  {residenteSale && visitaActiva.persona_visitada && (
                    <div className="flex-1 min-w-[240px] max-w-[300px] bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border-2 border-amber-300 shadow-md flex flex-col justify-between animate-fade-in-up">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">🏠</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300">
                            Residente
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 text-base leading-snug">
                          {visitaActiva.persona_visitada}
                        </p>
                        {visitaActiva.parentesco && (
                          <p className="text-xs text-amber-800 font-medium mt-1">
                            Parentesco: {visitaActiva.parentesco}
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-emerald-800 mt-2 flex items-center gap-1">
                          ✓ Salida del centro autorizada
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setResidenteSale(false)}
                        className="mt-3 text-xs text-red-600 hover:text-red-700 font-semibold text-right underline cursor-pointer"
                      >
                        Quitar de la salida ✕
                      </button>
                    </div>
                  )}

                  {/* Indicación visual si el residente no ha sido añadido */}
                  {!residenteSale && (
                    <div className="flex-1 min-w-[200px] h-[100px] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-center p-3 text-gray-400 text-xs">
                      <span>⬇️</span>
                      <span className="font-medium mt-1">
                        Arrastre aquí al residente si sale del centro
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── ÁREA INFERIOR: Incluir persona que visita (Residente) ── */}
              <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/80 mb-6">
                <div className="mb-3">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 font-serif">
                    Incluya a todas la persona que realizan la salida del centro
                  </h3>
                  <p className="text-xs text-gray-600">
                    Si el residente visitado sale al exterior o abandona las
                    instalaciones con ustedes, arrastre su tarjeta a la zona
                    superior o pulse el botón para incluirlo/a.
                  </p>
                </div>

                {visitaActiva.persona_visitada ? (
                  !residenteSale ? (
                    /* Tarjeta arrastrable del residente */
                    <div
                      draggable={true}
                      onDragStart={handleDragStart}
                      className="inline-flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-md transition-all select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xl font-bold cursor-grab">
                          ⠿
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
                          🏠
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">
                              {visitaActiva.persona_visitada}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Residente visitado/a
                            </span>
                          </div>
                          {visitaActiva.parentesco && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Parentesco:{" "}
                              <strong className="text-gray-700">
                                {visitaActiva.parentesco}
                              </strong>
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setResidenteSale(true)}
                        className="btn btn-secondary text-xs py-2 px-4 whitespace-nowrap self-end sm:self-center"
                      >
                        + Añadir a la salida
                      </button>
                    </div>
                  ) : (
                    /* Mensaje de confirmación si ya fue subido */
                    <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>✓</span> El residente{" "}
                        <strong>{visitaActiva.persona_visitada}</strong> ha sido
                        incluido en la salida del centro.
                      </span>
                      <button
                        type="button"
                        onClick={() => setResidenteSale(false)}
                        className="text-gray-500 hover:text-red-600 underline font-normal"
                      >
                        Deshacer
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No consta persona visitada registrada en esta visita.
                  </p>
                )}
              </div>

              {/* Mensaje de Error si ocurre */}
              {errorMessage && (
                <div
                  className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm font-medium animate-fade-in-up"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              {/* Botón de Confirmación Definitiva */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-end border-t border-gray-150 pt-5">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 text-gray-600 text-base font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmarSalida}
                  disabled={isLoading}
                  className="btn btn-secondary w-full sm:w-auto text-lg py-3 px-8 shadow-md disabled:opacity-40"
                >
                  {isLoading ? "Registrando salida..." : "Confirmar Salida del Centro"}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              PASO 3: Éxito y Despedida
             ════════════════════════════════════════════════════════════════ */}
          {step === "success" && successData && (
            <div className="card w-full max-w-lg p-8 md:p-10 shadow-xl bg-white rounded-3xl border border-gray-150 text-center animate-fade-in-up">
              {/* Check Icon */}
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold shadow-inner">
                ✓
              </div>

              <h2 className="text-3xl font-bold text-gray-800 font-serif mb-2">
                ¡Hasta pronto, {successData.nombre}!
              </h2>

              <p className="text-gray-600 text-base md:text-lg mb-4">
                {successData.message || (
                  <>
                    Su salida ha sido registrada a las{" "}
                    <strong className="text-gray-900">
                      {new Date(successData.fecha_salida).toLocaleTimeString(
                        "es-ES",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </strong>
                    .
                  </>
                )}
              </p>

              {/* Resumen de si salió con el residente */}
              {successData.residente_sale && successData.persona_visitada && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <span>⚠️</span> Salida conjunta registrada con el residente:{" "}
                  <strong>{successData.persona_visitada}</strong>
                </div>
              )}

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
 * - Flujo en dos pasos: primero consulta la visita por DNI sin cerrarla, permitiendo
 *   visualizar a todos los integrantes (visitante principal y acompañantes).
 * - Drop zone superior con tarjetas horizontales (flex-wrap con anchos mínimos y máximos)
 *   para garantizar un aspecto impecable tanto en resoluciones tablet como escritorio.
 * - Doble interacción para accesibilidad en tablet (kiosco): Drag and drop nativo
 *   junto con un botón táctil de respaldo («+ Añadir a la salida») para asegurar que
 *   los usuarios puedan interactuar sin frustración táctil.
 * - La condición de si el residente sale o no se transmite explícitamente al endpoint
 *   mediante el booleano `residente_sale`.
 *
 * Edge cases cubiertos:
 * - Visita sin acompañantes o sin persona visitada registrada: la interfaz se adapta limpiamente.
 * - Salida ya registrada previamente: detectado en el paso 1 para no permitir doble salida.
 * - Posibilidad de deshacer o quitar al residente de la zona superior antes de confirmar.
 */
