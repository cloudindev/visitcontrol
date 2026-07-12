"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import SignaturePad from "@/components/SignaturePad";
import BackButton from "@/components/BackButton";

/** Referencia expuesta por SignaturePad */
interface SignaturePadRef {
  toDataURL: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

/** Datos del visitante recuperados del servidor */
interface VisitanteData {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
}

/**
 * Contenido principal de la página de confirmación.
 * Separado del export default para poder envolver con Suspense
 * (requerido por useSearchParams en Next.js App Router).
 */
function ConfirmarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitanteId = searchParams.get("id");

  const signatureRef = useRef<SignaturePadRef>(null);

  const [visitante, setVisitante] = useState<VisitanteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  /** Cargar datos del visitante desde el servidor */
  useEffect(() => {
    if (!visitanteId) {
      setError("No se proporcionó un identificador válido");
      setLoading(false);
      return;
    }

    const fetchVisitante = async () => {
      try {
        // Usamos el endpoint de consulta con un param especial
        const res = await fetch("/api/visitantes/consultar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: visitanteId }),
        });

        const data = await res.json();

        if (!res.ok || !data.found) {
          setError("No se encontró el registro del visitante");
          return;
        }

        setVisitante(data.visitante);
      } catch {
        setError("Error al cargar los datos. Inténtelo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchVisitante();
  }, [visitanteId]);

  /** Enviar nueva visita con firma */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError("");

      if (signatureEmpty || signatureRef.current?.isEmpty()) {
        setFormError("La firma es obligatoria");
        return;
      }

      if (!aceptaDatos) {
        setFormError("Debe certificar la veracidad de sus datos");
        return;
      }

      setIsSubmitting(true);

      try {
        const firma = signatureRef.current?.toDataURL() ?? "";

        const res = await fetch("/api/visitas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitante_id: visitanteId,
            firma,
            acepta_terminos: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setFormError(data.error || "Error al registrar la visita");
          return;
        }

        router.push("/exito");
      } catch {
        setFormError("Error de conexión. Inténtelo de nuevo.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [visitanteId, signatureEmpty, aceptaDatos, router]
  );

  /* ── Estado de carga ── */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-primary mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-label="Cargando"
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
          <p className="text-gray-500 text-lg">Cargando datos...</p>
        </div>
      </main>
    );
  }

  /* ── Estado de error ── */
  if (error || !visitante) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-3xl" aria-hidden="true">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {error || "Error desconocido"}
          </h2>
          <button
            onClick={() => router.push("/consulta")}
            className="btn btn-primary mt-4"
          >
            Volver a Consulta
          </button>
        </div>
      </main>
    );
  }

  /* ── Contenido principal: 2 columnas ── */
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-5xl">
        <BackButton href="/consulta" />

        <div className="grid grid-cols-2 gap-8 mt-4">
          {/* ── Columna izquierda: datos del visitante ── */}
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 font-serif">
                Datos del Visitante
              </h2>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-surface rounded-xl">
                <span className="field-label">Nombre</span>
                <p className="text-xl text-gray-800 font-medium">
                  {visitante.nombre}
                </p>
              </div>

              <div className="p-4 bg-surface rounded-xl">
                <span className="field-label">Apellidos</span>
                <p className="text-xl text-gray-800 font-medium">
                  {visitante.apellidos}
                </p>
              </div>

              <div className="p-4 bg-surface rounded-xl">
                <span className="field-label">DNI / Documento</span>
                <p className="text-xl text-gray-800 font-medium font-mono tracking-wider">
                  {visitante.dni}
                </p>
              </div>
            </div>
          </div>

          {/* ── Columna derecha: firma + confirmación ── */}
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-gray-800 font-serif mb-6">
              Confirmar Visita
            </h2>

            <form onSubmit={handleSubmit} noValidate>
              {/* Firma */}
              <div className="mb-6">
                <SignaturePad
                  ref={signatureRef}
                  onSignatureChange={(isEmpty) => {
                    setSignatureEmpty(isEmpty);
                    if (!isEmpty) setFormError("");
                  }}
                />
              </div>

              {/* Checkbox veracidad */}
              <label
                htmlFor="acepta-datos"
                className="flex items-start gap-3 mb-6 cursor-pointer select-none"
              >
                <input
                  id="acepta-datos"
                  type="checkbox"
                  checked={aceptaDatos}
                  onChange={(e) => {
                    setAceptaDatos(e.target.checked);
                    if (e.target.checked) setFormError("");
                  }}
                  className="mt-1 w-6 h-6 rounded border-2 border-gray-300 text-primary focus:ring-primary accent-primary flex-shrink-0"
                />
                <span className="text-gray-600 text-base leading-snug">
                  Certifico que los datos arriba expuestos son veraces
                </span>
              </label>

              {/* Error */}
              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm">
                  {formError}
                </div>
              )}

              {/* Botón confirmar */}
              <button
                id="btn-confirmar-visita"
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full text-xl"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
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
                    Procesando...
                  </>
                ) : (
                  <>
                    Confirmar y Finalizar
                    <span aria-hidden="true">✓</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Página de Confirmación de Datos.
 *
 * Layout a dos columnas (landscape):
 * - Izquierda: datos read-only del visitante
 * - Derecha: firma digital nueva + checkbox de veracidad
 *
 * Envuelto en Suspense por requerimiento de Next.js para useSearchParams.
 */
export default function ConfirmarPage() {
  return (
    <LandscapeGuard>
      <InactivityGuard>
        <Suspense
          fallback={
            <main className="min-h-screen flex items-center justify-center">
              <p className="text-gray-500 text-lg">Cargando...</p>
            </main>
          }
        >
          <ConfirmarContent />
        </Suspense>
      </InactivityGuard>
    </LandscapeGuard>
  );
}

/*
 * ─── Decisión técnica ───
 * Se usa Suspense boundary obligatorio para useSearchParams en App Router.
 * El ID del visitante se pasa como query param (?id=UUID) en lugar de
 * como ruta dinámica para evitar crear un segmento dinámico adicional.
 *
 * El endpoint /api/visitantes/consultar acepta tanto `dni` como `id`
 * para permitir la carga directa desde esta página.
 *
 * Edge cases cubiertos:
 * - Sin parámetro id en la URL
 * - Visitante no encontrado
 * - Firma vacía
 * - Checkbox no marcado
 * - Error de red
 */
