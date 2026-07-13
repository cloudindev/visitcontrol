"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import SignaturePad from "@/components/SignaturePad";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/api";

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
  const [aceptaDatos, setAceptaDatos] = useState(true);
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
        const res = await fetch(`${API_BASE}/visitantes/consultar`, {
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

        const res = await fetch(`${API_BASE}/visitas`, {
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
    <main className="min-h-screen flex flex-col px-6 py-6">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">

        {/* ── Fila superior: Volver + Datos del visitante ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <BackButton href="/consulta" />

          <div className="card flex-1 w-full px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Título */}
              <h2 className="text-xl font-bold text-gray-800 font-serif whitespace-nowrap">
                Datos del Visitante
              </h2>

              {/* Datos en fila */}
              <div className="flex flex-col md:flex-row flex-1 gap-3 md:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Nombre</span>
                  <span className="text-base font-medium text-gray-800">{visitante.nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Apellidos</span>
                  <span className="text-base font-medium text-gray-800">{visitante.apellidos}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">DNI</span>
                  <span className="text-base font-medium text-gray-800 font-mono tracking-wider">{visitante.dni}</span>
                </div>
              </div>

              {/* Checkbox */}
              <label
                htmlFor="acepta-datos"
                className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap"
              >
                <input
                  id="acepta-datos"
                  type="checkbox"
                  checked={aceptaDatos}
                  onChange={(e) => {
                    setAceptaDatos(e.target.checked);
                    if (e.target.checked) setFormError("");
                  }}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-primary focus:ring-primary accent-primary flex-shrink-0"
                />
                <span className="text-gray-600 text-sm">
                  Certifico que mis datos son veraces
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Área de firma grande ── */}
        <div className="card p-6 flex flex-col">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 font-serif mb-4">
            Firme aquí
          </h2>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col">
            {/* Firma — ocupa todo el espacio disponible */}
            <div className="flex-1 mb-4">
              <SignaturePad
                ref={signatureRef}
                onSignatureChange={(isEmpty) => {
                  setSignatureEmpty(isEmpty);
                  if (!isEmpty) setFormError("");
                }}
              />
            </div>

            {/* Error */}
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm">
                {formError}
              </div>
            )}

            {/* Botón confirmar — se activa solo con firma */}
            <button
              id="btn-confirmar-visita"
              type="submit"
              disabled={isSubmitting || signatureEmpty}
              className="btn btn-primary w-full text-xl disabled:opacity-40 disabled:cursor-not-allowed"
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
                "Finalizar"
              )}
            </button>
          </form>
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
