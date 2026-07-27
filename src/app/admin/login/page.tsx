"use client";

/**
 * @file page.tsx
 * @description Pantalla de inicio de sesión para el panel de administración.
 *
 * Sigue la Guía de Estilo Antigravity-React y las directrices de la regla general.
 */

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_BASE } from "@/lib/api";

// ── 1. Interfaces ────────────────────────────────────────────────────────────
interface LoginError {
  message: string;
}

// ── 2. Component Logic & Render ──────────────────────────────────────────────
export default function AdminLoginPage() {
  const router = useRouter();

  // Estados del componente
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LoginError | null>(null);

  // Manejadores de cambios tipados
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  }, []);

  // Envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      setError({ message: "Por favor, complete todos los campos." });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      // Redireccionar al panel administrativo (Next.js añade el basePath automáticamente)
      router.push("/admin");
    } catch (err: unknown) {
      console.error("[Login] Error de autenticación:", err);
      const msg = err instanceof Error ? err.message : "Error de conexión con el servidor.";
      setError({ message: msg });
      setLoading(false);
    }
  }, [username, password, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
      {/* Contenedor principal con logo */}
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Cabecera / Logo */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/images/logo-residencial-sanesteban.png"
            alt="Logo Residencial San Esteban"
            width={90}
            height={90}
            className="rounded-2xl shadow-sm mb-4"
            priority
          />
          <h1 className="text-3xl font-extrabold text-primary font-serif text-center">
            Residencial San Esteban
          </h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Panel de Control - Acceso de Personal
          </p>
        </div>

        {/* Card del Formulario */}
        <div className="card w-full p-8 shadow-xl bg-white rounded-2xl border border-gray-150">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Identificación requerida
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Campo: Usuario */}
            <div>
              <label htmlFor="username" className="field-label mb-1.5 block">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Introduzca su usuario"
                className="input-field w-full text-base py-3 px-4"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label htmlFor="password" className="field-label mb-1.5 block">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Introduzca su contraseña"
                className="input-field w-full text-base py-3 px-4"
                disabled={loading}
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm font-medium"
                role="alert"
              >
                {error.message}
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-lg py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
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
                  Iniciando sesión...
                </>
              ) : (
                "Acceder al Panel"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Se separa el formulario en un card con diseño limpio e intuitivo, alineado
 *   a los tokens de diseño (colores primary y card de la app principal).
 * - Se utiliza `useCallback` en los event handlers para optimizar el rendimiento
 *   y evitar re-declaraciones de funciones en cada renderizado.
 * - Soporte nativo de accesibilidad (A11y) usando `role="alert"` para los
 *   mensajes de error dinámicos e inputs etiquetados con `htmlFor`.
 *
 * Edge cases cubiertos:
 * - Intento de envío de formulario vacío o incompleto controlado localmente
 *   para evitar llamadas fetch innecesarias al servidor.
 * - Estado de carga (`loading`) deshabilita campos y botón para evitar doble
 *   envío accidental (double-submit) por parte del usuario.
 * - Captura y parseo de errores de red o errores lanzados por la API.
 */
