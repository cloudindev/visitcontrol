"use client";

/**
 * @file page.tsx
 * @description Pantalla de Registro de Visita (Entrada).
 *
 * Flujo:
 * 1. Campo 1: DNI / Documento.
 * 2. Al saltar al campo Nombre (o al salir de DNI), consulta si ya está registrado.
 *    Si existe, auto-completa Nombre y Apellidos.
 * 3. Campos 2 y 3: Nombre y Apellidos.
 * 4. Fila Acompañantes: permite añadir filas de 3 campos ilimitadamente.
 * 5. Firma Digital: situada debajo de los acompañantes.
 * 6. Botón de confirmación que se activa al completar los datos requeridos y la firma.
 */

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LandscapeGuard from "@/components/LandscapeGuard";
import InactivityGuard from "@/components/InactivityGuard";
import SignaturePad from "@/components/SignaturePad";
import { validateDocumento } from "@/lib/validators";
import { API_BASE } from "@/lib/api";

// ── 1. Interfaces ────────────────────────────────────────────────────────────

interface SignaturePadRef {
  toDataURL: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

interface FormState {
  dni: string;
  nombre: string;
  apellidos: string;
  persona_visitada: string;
  parentesco: string;
}

export interface AcompananteItem {
  id: string;
  dni: string;
  nombre: string;
  apellidos: string;
}

interface FormErrors {
  dni?: string;
  nombre?: string;
  apellidos?: string;
  persona_visitada?: string;
  parentesco?: string;
  firma?: string;
  general?: string;
}

// ── 2. Component Logic & Render ──────────────────────────────────────────────

export default function RegistroPage() {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadRef>(null);

  // Estados del formulario principal
  const [form, setForm] = useState<FormState>({
    dni: "",
    nombre: "",
    apellidos: "",
    persona_visitada: "",
    parentesco: "",
  });

  // Lista dinámica de acompañantes
  const [acompanantes, setAcompanantes] = useState<AcompananteItem[]>([]);

  // Estados auxiliares
  const [errors, setErrors] = useState<FormErrors>({});
  const [signatureEmpty, setSignatureEmpty] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingDni, setIsCheckingDni] = useState<boolean>(false);
  const [isReturningVisitor, setIsReturningVisitor] = useState<boolean>(false);
  const [lastCheckedDni, setLastCheckedDni] = useState<string>("");

  /**
   * Consulta a la base de datos si el DNI ya está registrado para auto-rellenar
   * Nombre y Apellidos al pasar al siguiente campo.
   */
  const checkExistingDni = useCallback(
    async (dniToCheck: string) => {
      const cleanDni = dniToCheck.trim();
      if (!cleanDni || cleanDni === lastCheckedDni) return;
      if (!validateDocumento(cleanDni)) return;

      setIsCheckingDni(true);
      setLastCheckedDni(cleanDni);

      try {
        const res = await fetch(`${API_BASE}/visitantes/consultar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: cleanDni }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.found && data.visitante) {
            setForm((prev) => ({
              ...prev,
              nombre: data.visitante.nombre || prev.nombre,
              apellidos: data.visitante.apellidos || prev.apellidos,
            }));
            setIsReturningVisitor(true);
            setErrors((prev) => ({
              ...prev,
              dni: undefined,
              nombre: undefined,
              apellidos: undefined,
            }));
          } else {
            setIsReturningVisitor(false);
          }
        }
      } catch (err: unknown) {
        console.warn("[Registro] Error comprobando DNI previo:", err);
      } finally {
        setIsCheckingDni(false);
      }
    },
    [lastCheckedDni]
  );

  /** Manejador de cambios en los campos principales */
  const handleMainChange = useCallback(
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));

        if (field === "dni") {
          setIsReturningVisitor(false);
          // Si el usuario introduce un DNI con formato completo (9 caracteres), consultar proactivamente
          if (value.trim().length >= 9 && validateDocumento(value)) {
            checkExistingDni(value);
          }
        }
      },
    [checkExistingDni]
  );

  /** Al salir del campo DNI, comprobar automáticamente si está registrado */
  const handleDniBlur = useCallback(() => {
    if (form.dni.trim()) {
      checkExistingDni(form.dni);
    }
  }, [form.dni, checkExistingDni]);

  /** Al hacer foco en el campo Nombre, verificar también si no se había consultado */
  const handleNombreFocus = useCallback(() => {
    if (form.dni.trim()) {
      checkExistingDni(form.dni);
    }
  }, [form.dni, checkExistingDni]);

  // ── Gestión dinámica de acompañantes ───────────────────────────────────────

  /** Añade una nueva fila de 3 campos de acompañante */
  const handleAddAcompanante = useCallback(() => {
    const newItem: AcompananteItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dni: "",
      nombre: "",
      apellidos: "",
    };
    setAcompanantes((prev) => [...prev, newItem]);
  }, []);

  /** Actualiza un campo de un acompañante específico */
  const handleAcompananteChange = useCallback(
    (id: string, field: "dni" | "nombre" | "apellidos", value: string) => {
      setAcompanantes((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  /** Elimina un acompañante */
  const handleRemoveAcompanante = useCallback((id: string) => {
    setAcompanantes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Validación y Envío ─────────────────────────────────────────────────────

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};

    if (!form.dni.trim()) {
      errs.dni = "El documento es obligatorio";
    } else if (!validateDocumento(form.dni)) {
      errs.dni = "Formato no válido (DNI o NIE español)";
    }

    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!form.apellidos.trim()) errs.apellidos = "Los apellidos son obligatorios";
    if (!form.persona_visitada.trim()) errs.persona_visitada = "Indique la persona a la que visita";
    if (!form.parentesco.trim()) errs.parentesco = "Seleccione el parentesco";

    if (signatureEmpty || signatureRef.current?.isEmpty()) {
      errs.firma = "La firma es obligatoria";
    }

    return errs;
  }, [form, signatureEmpty]);

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

        // Filtrar acompañantes válidos (que tengan al menos nombre o apellidos)
        const validAcompanantes = acompanantes
          .filter((a) => a.nombre.trim() || a.apellidos.trim())
          .map((a) => ({
            dni: a.dni.trim(),
            nombre: a.nombre.trim(),
            apellidos: a.apellidos.trim(),
          }));

        const res = await fetch(`${API_BASE}/visitantes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dni: form.dni.trim(),
            nombre: form.nombre.trim(),
            apellidos: form.apellidos.trim(),
            persona_visitada: form.persona_visitada.trim(),
            parentesco: form.parentesco.trim(),
            firma,
            acompanantes: validAcompanantes,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrors({ general: data.error || "Error al registrar la visita" });
          return;
        }

        router.push("/exito");
      } catch (err: unknown) {
        console.error("[Registro] Error en submit:", err);
        setErrors({ general: "Error de conexión. Inténtelo de nuevo." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, acompanantes, validate, router]
  );

  return (
    <LandscapeGuard>
      <InactivityGuard>
        <main className="min-h-screen flex flex-col items-center justify-start px-6 py-6 md:py-8">
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

          <div className="card w-full max-w-5xl p-6 md:p-8 shadow-xl bg-white rounded-3xl border border-gray-150">
            {/* Cabecera */}
            <div className="text-center mb-6">
              <h1 className="text-3xl md:text-5xl font-bold text-primary font-serif mb-1">
                Registro de visita
              </h1>
              <p className="text-gray-500 text-sm md:text-base">
                Complete los siguientes datos para registrar su visita
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* ── Fila Principal: DNI (1º) + Nombre (2º) + Apellidos (3º) ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* 1. DNI / Documento */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="dni" className="field-label">
                      DNI / Documento
                    </label>
                    {isCheckingDni && (
                      <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse">
                        Buscando...
                      </span>
                    )}
                  </div>
                  <input
                    id="dni"
                    type="text"
                    value={form.dni}
                    onChange={handleMainChange("dni")}
                    onBlur={handleDniBlur}
                    className={`input-field ${errors.dni ? "input-error" : ""}`}
                    placeholder="Ej: 12345678X"
                    autoComplete="off"
                    autoFocus
                  />
                  {errors.dni && (
                    <p className="text-danger text-sm mt-1">{errors.dni}</p>
                  )}
                  {isReturningVisitor && (
                    <p className="text-emerald-700 text-xs font-semibold mt-1 flex items-center gap-1">
                      ✓ Visitante registrado previamente
                    </p>
                  )}
                </div>

                {/* 2. Nombre */}
                <div>
                  <label htmlFor="nombre" className="field-label mb-1 block">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={handleMainChange("nombre")}
                    onFocus={handleNombreFocus}
                    className={`input-field ${errors.nombre ? "input-error" : ""}`}
                    placeholder="Ej: María"
                    autoComplete="given-name"
                  />
                  {errors.nombre && (
                    <p className="text-danger text-sm mt-1">{errors.nombre}</p>
                  )}
                </div>

                {/* 3. Apellidos */}
                <div>
                  <label htmlFor="apellidos" className="field-label mb-1 block">
                    Apellidos
                  </label>
                  <input
                    id="apellidos"
                    type="text"
                    value={form.apellidos}
                    onChange={handleMainChange("apellidos")}
                    className={`input-field ${errors.apellidos ? "input-error" : ""}`}
                    placeholder="Ej: García López"
                    autoComplete="family-name"
                  />
                  {errors.apellidos && (
                    <p className="text-danger text-sm mt-1">{errors.apellidos}</p>
                  )}
                </div>
              </div>

              {/* ── Fila 2: Persona que visita + Parentesco ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Persona que visita */}
                <div>
                  <label htmlFor="persona_visitada" className="field-label mb-1 block">
                    Persona que visita <span className="text-danger">*</span>
                  </label>
                  <input
                    id="persona_visitada"
                    type="text"
                    value={form.persona_visitada}
                    onChange={handleMainChange("persona_visitada")}
                    className={`input-field ${errors.persona_visitada ? "input-error" : ""}`}
                    placeholder="Nombre del residente o persona a la que visita"
                    autoComplete="off"
                  />
                  {errors.persona_visitada && (
                    <p className="text-danger text-sm mt-1">{errors.persona_visitada}</p>
                  )}
                </div>

                {/* Parentesco */}
                <div>
                  <label htmlFor="parentesco" className="field-label mb-1 block">
                    Parentesco <span className="text-danger">*</span>
                  </label>
                  <select
                    id="parentesco"
                    value={form.parentesco}
                    onChange={handleMainChange("parentesco")}
                    className={`input-field ${errors.parentesco ? "input-error" : ""}`}
                  >
                    <option value="">Seleccione parentesco...</option>
                    <option value="Hija/hijo">Hija/hijo</option>
                    <option value="Hermana/hermano">Hermana/hermano</option>
                    <option value="Esposa/esposo">Esposa/esposo</option>
                    <option value="Otro familiar">Otro familiar</option>
                    <option value="Amistad">Amistad</option>
                  </select>
                  {errors.parentesco && (
                    <p className="text-danger text-sm mt-1">{errors.parentesco}</p>
                  )}
                </div>
              </div>

              {/* ── Fila de Acompañantes ── */}
              <div className="border-t border-gray-150 pt-5 pb-2 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 font-serif">
                      Acompañantes
                    </h2>
                    <p className="text-xs text-gray-500">
                      Añada acompañantes si no realizan visita individual
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAcompanante}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-primary font-semibold text-sm transition-all active:scale-95 border border-gray-200"
                  >
                    <span className="text-lg leading-none font-bold">+</span> Añadir acompañante
                  </button>
                </div>

                {/* Lista de filas de acompañantes */}
                {acompanantes.length > 0 && (
                  <div className="space-y-3 mb-2">
                    {acompanantes.map((ac, index) => (
                      <div
                        key={ac.id}
                        className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 relative animate-fade-in-up"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Acompañante #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAcompanante(ac.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors"
                            aria-label={`Eliminar acompañante ${index + 1}`}
                          >
                            Eliminar ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                              DNI / Documento (opcional)
                            </label>
                            <input
                              type="text"
                              value={ac.dni}
                              onChange={(e) =>
                                handleAcompananteChange(ac.id, "dni", e.target.value)
                              }
                              placeholder="Ej: 87654321B"
                              className="input-field text-sm py-2 px-3 h-10"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                              Nombre
                            </label>
                            <input
                              type="text"
                              value={ac.nombre}
                              onChange={(e) =>
                                handleAcompananteChange(ac.id, "nombre", e.target.value)
                              }
                              placeholder="Nombre"
                              className="input-field text-sm py-2 px-3 h-10"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">
                              Apellidos
                            </label>
                            <input
                              type="text"
                              value={ac.apellidos}
                              onChange={(e) =>
                                handleAcompananteChange(ac.id, "apellidos", e.target.value)
                              }
                              placeholder="Apellidos"
                              className="input-field text-sm py-2 px-3 h-10"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Firma digital ── */}
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
                <div
                  className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-danger text-center text-sm font-medium"
                  role="alert"
                >
                  {errors.general}
                </div>
              )}

              {/* Botón confirmar */}
              <button
                id="btn-enviar-registro"
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.dni.trim() ||
                  !form.nombre.trim() ||
                  !form.apellidos.trim() ||
                  !form.persona_visitada.trim() ||
                  !form.parentesco.trim() ||
                  signatureEmpty
                }
                className="btn btn-primary w-full text-xl py-3.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? (
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
                    Enviando...
                  </>
                ) : (
                  "Confirmar mis datos"
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
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Se coloca el campo DNI en primer lugar para permitir la identificación
 *   anticipada y el auto-rellenado sin fricción ni necesidad de pantallas extra.
 * - La verificación del DNI se dispara proactivamente en dos momentos clave:
 *   al perder el foco el DNI (onBlur) o al entrar en el campo Nombre (onFocus),
 *   así como al alcanzar los 9 caracteres válidos de un documento español.
 * - Lista dinámica de acompañantes usando identificadores únicos con prefijo
 *   temporal para asegurar que la adición/eliminación de filas sea completamente
 *   inmutable en React y no sufra de fallos de re-renderizado con índices.
 * - El canvas de firma se encuentra inmediatamente debajo de los acompañantes,
 *   garantizando una experiencia fluida de lectura vertical de arriba a abajo.
 *
 * Edge cases cubiertos:
 * - DNI ya registrado: rellena automáticamente y conserva ediciones manuales.
 * - DNI no registrado: mantiene los campos limpios sin bloquear el registro.
 * - Acompañantes añadidos pero dejados vacíos: se filtran antes de enviar a la API
 *   para no almacenar registros basura con strings vacíos.
 * - Prevención de peticiones duplicadas a la API de consulta usando lastCheckedDni.
 */
