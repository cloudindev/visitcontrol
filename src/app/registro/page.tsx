"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import SignaturePad from "@/components/SignaturePad";
import BackButton from "@/components/BackButton";
import { validateDocumento } from "@/lib/validators";
import { API_BASE } from "@/lib/api";

/** Referencia expuesta por SignaturePad */
interface SignaturePadRef {
  toDataURL: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

/** Estado del formulario de registro */
interface FormState {
  nombre: string;
  apellidos: string;
  dni: string;
}

/** Errores de validación por campo */
interface FormErrors {
  nombre?: string;
  apellidos?: string;
  dni?: string;
  firma?: string;
  general?: string;
}

/**
 * Página de Registro — Primera Visita.
 *
 * Formulario completo con validación de DNI/NIE español (letra de control),
 * firma digital obligatoria, y detección de DNI duplicado.
 */
export default function RegistroPage() {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadRef>(null);

  const [form, setForm] = useState<FormState>({
    nombre: "",
    apellidos: "",
    dni: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dniExistsError, setDniExistsError] = useState(false);

  /** Actualiza un campo del formulario y limpia su error */
  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
      if (field === "dni") setDniExistsError(false);
    },
    []
  );

  /** Validación local completa del formulario */
  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};

    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!form.apellidos.trim()) errs.apellidos = "Los apellidos son obligatorios";

    if (!form.dni.trim()) {
      errs.dni = "El documento es obligatorio";
    } else if (!validateDocumento(form.dni)) {
      errs.dni = "Formato de documento no válido (DNI o NIE español)";
    }

    if (signatureEmpty || signatureRef.current?.isEmpty()) {
      errs.firma = "La firma es obligatoria";
    }

    return errs;
  }, [form, signatureEmpty]);

  /** Envío del formulario al servidor */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        const firma = signatureRef.current?.toDataURL() ?? "";

        const res = await fetch(`${API_BASE}/visitantes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            apellidos: form.apellidos.trim(),
            dni: form.dni.trim(),
            firma,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "DNI_EXISTS") {
            setDniExistsError(true);
            setErrors({ dni: "Este documento ya está registrado" });
          } else {
            setErrors({ general: data.error || "Error al enviar el registro" });
          }
          return;
        }

        router.push("/exito");
      } catch {
        setErrors({ general: "Error de conexión. Inténtelo de nuevo." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, validate, router]
  );

  return (
    <LandscapeGuard>
      <InactivityGuard>
        <main className="min-h-screen flex items-center justify-center px-6 py-4">
          <div className="card w-full max-w-5xl p-6">
            {/* Navegación */}
            <BackButton />

            {/* Cabecera */}
            <div className="text-center mb-4">
              <h1 className="text-3xl md:text-5xl font-bold text-primary font-serif mb-1">
                Registro de visita
              </h1>
              <p className="text-gray-500">
                Complete los siguientes datos para registrar su primera visita
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Nombre + Apellidos + DNI en una fila */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="nombre" className="field-label">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={handleChange("nombre")}
                    className={`input-field ${errors.nombre ? "input-error" : ""}`}
                    placeholder="Ej: María"
                    autoComplete="given-name"
                  />
                  {errors.nombre && (
                    <p className="text-danger text-sm mt-1">{errors.nombre}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="apellidos" className="field-label">
                    Apellidos
                  </label>
                  <input
                    id="apellidos"
                    type="text"
                    value={form.apellidos}
                    onChange={handleChange("apellidos")}
                    className={`input-field ${errors.apellidos ? "input-error" : ""}`}
                    placeholder="Ej: García López"
                    autoComplete="family-name"
                  />
                  {errors.apellidos && (
                    <p className="text-danger text-sm mt-1">{errors.apellidos}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dni" className="field-label">
                    DNI / Documento
                  </label>
                  <input
                    id="dni"
                    type="text"
                    value={form.dni}
                    onChange={handleChange("dni")}
                    className={`input-field ${errors.dni ? "input-error" : ""}`}
                    placeholder="Ej: 12345678X"
                    autoComplete="off"
                    inputMode="text"
                  />
                  {errors.dni && (
                    <p className="text-danger text-sm mt-1">{errors.dni}</p>
                  )}
                  {dniExistsError && (
                    <p className="text-sm mt-1 text-gray-600">
                      ¿Ya registrado?{" "}
                      <Link
                        href="/consulta"
                        className="text-primary underline font-medium"
                      >
                        Acceda aquí →
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Firma digital */}
              <div className="mb-4">
                <SignaturePad
                  ref={signatureRef}
                  onSignatureChange={(isEmpty) => {
                    setSignatureEmpty(isEmpty);
                    if (!isEmpty) {
                      setErrors((prev) => ({ ...prev, firma: undefined }));
                    }
                  }}
                />
                {errors.firma && (
                  <p className="text-danger text-sm mt-1">{errors.firma}</p>
                )}
              </div>

              {/* Error general */}
              {errors.general && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm">
                  {errors.general}
                </div>
              )}

              {/* Botón enviar */}
              <button
                id="btn-enviar-registro"
                type="submit"
                disabled={isSubmitting || !form.nombre.trim() || !form.apellidos.trim() || !form.dni.trim() || signatureEmpty}
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
                    Enviando...
                  </>
                ) : (
                  "Confirmar mi visita"
                )}
              </button>
            </form>
          </div>
        </main>
      </InactivityGuard>
    </LandscapeGuard>
  );
}

/*
 * ─── Decisión técnica ───
 * La validación de DNI/NIE se ejecuta tanto en cliente (UX instantáneo)
 * como en servidor (seguridad). La detección de DNI duplicado solo puede
 * hacerse en el servidor, por eso el error DNI_EXISTS se maneja tras el
 * fetch y se ofrece un link directo al flujo de visitante recurrente.
 *
 * Edge cases cubiertos:
 * - DNI con letra minúscula (se normaliza)
 * - NIE con prefijo X/Y/Z
 * - Firma vacía (canvas sin trazos)
 * - Error de red (catch genérico)
 * - DNI duplicado (código 409)
 */
