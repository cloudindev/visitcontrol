"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import { validateDocumento } from "@/lib/validators";
import { API_BASE } from "@/lib/api";

/**
 * Página de Consulta — Visitante Recurrente.
 *
 * Permite buscar un visitante por su DNI/NIE.
 * Si se encuentra, redirige a /confirmar con el ID del visitante.
 * Si no se encuentra, ofrece link al registro de primera visita.
 */
export default function ConsultaPage() {
  const router = useRouter();

  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  /** Buscar visitante por DNI en el servidor */
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setNotFound(false);

      if (!dni.trim()) {
        setError("Ingrese su número de documento");
        return;
      }

      if (!validateDocumento(dni)) {
        setError("Formato de documento no válido (DNI o NIE español)");
        return;
      }

      setIsSearching(true);

      try {
        const res = await fetch(`${API_BASE}/visitantes/consultar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dni.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Error al consultar");
          return;
        }

        if (!data.found) {
          setNotFound(true);
          return;
        }

        // Visitante encontrado → redirigir a confirmación
        router.push(`/confirmar?id=${data.visitante.id}`);
      } catch {
        setError("Error de conexión. Inténtelo de nuevo.");
      } finally {
        setIsSearching(false);
      }
    },
    [dni, router]
  );

  return (
    <LandscapeGuard>
      <InactivityGuard>
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
          {/* Logo como enlace a Home */}
          <Link href="/" className="mb-6">
            <Image
              src="/images/logo-residencial-sanesteban.png"
              alt="Logo Residencia de Mayores"
              width={100}
              height={100}
              className="rounded-2xl"
            />
          </Link>

          <div className="card w-full max-w-lg p-10">
            {/* Cabecera */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-5xl font-bold text-primary font-serif mb-2">
                Introduzca su DNI
              </h1>
              <p className="text-gray-500 text-lg">
                Ingrese su número de documento de identidad para poder confirmar sus datos
              </p>
            </div>

            {/* Formulario de búsqueda */}
            <form onSubmit={handleSearch} noValidate>
              <div className="mb-6">
                <label htmlFor="dni-consulta" className="field-label">
                  DNI / Documento de identidad
                </label>
                <input
                  id="dni-consulta"
                  type="text"
                  value={dni}
                  onChange={(e) => {
                    setDni(e.target.value);
                    setError("");
                    setNotFound(false);
                  }}
                  className={`input-field ${error ? "input-error" : ""}`}
                  placeholder="Ej: 12345678X"
                  autoComplete="off"
                  inputMode="text"
                />
                {error && (
                  <p className="text-danger text-sm mt-1">{error}</p>
                )}
              </div>

              <button
                id="btn-consultar"
                type="submit"
                disabled={isSearching}
                className="btn btn-primary w-full text-xl"
              >
                {isSearching ? (
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
                    Buscando...
                  </>
                ) : (
                  <>
                    Continuar
                  </>
                )}
              </button>
            </form>

            {/* Mensaje si no se encuentra el DNI */}
            {notFound && (
              <div className="mt-6 p-5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-gray-700 font-medium mb-2">
                  No se encontró ningún registro con ese documento.
                </p>
                <p className="text-gray-500 text-sm">
                  ¿Es su primera visita?{" "}
                  <Link
                    href="/registro"
                    className="text-primary underline font-medium"
                  >
                    Regístrese aquí →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </main>
      </InactivityGuard>
    </LandscapeGuard>
  );
}

/*
 * ─── Decisión técnica ───
 * La consulta por DNI usa POST en lugar de GET para evitar que el DNI
 * aparezca en la URL (dato sensible). El servidor solo devuelve
 * id/nombre/apellidos/dni, nunca el listado completo de visitantes.
 *
 * Edge cases cubiertos:
 * - DNI vacío
 * - Formato DNI/NIE inválido
 * - DNI no encontrado → sugerir registro
 * - Error de red
 */
