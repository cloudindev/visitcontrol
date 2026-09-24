"use client";

/**
 * @file AdminDashboard.tsx
 * @description Componente cliente interactivo del Panel de Administración de visitas.
 *
 * Proporciona búsquedas, filtros por fecha, visualización de firmas
 * en ventana emergente (modal), acompañantes, horas de entrada/salida y cierre de sesión.
 */

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_BASE } from "@/lib/api";
import { VisitaData } from "@/app/admin/page";

// ── 1. Interfaces ────────────────────────────────────────────────────────────
interface AdminDashboardProps {
  initialVisits: VisitaData[];
}

// ── 2. Component Logic & Render ──────────────────────────────────────────────
export default function AdminDashboard({ initialVisits }: AdminDashboardProps) {
  const router = useRouter();

  // Estados del cliente
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  // Manejador del campo de búsqueda con tipado correcto
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Manejador del campo de fecha con tipado correcto
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
  }, []);

  // Limpiar filtros
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterDate("");
  }, []);

  // Cerrar sesión
  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const response = await fetch(`${API_BASE}/admin/logout`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Fallo al cerrar sesión en el servidor");
      }

      // Redireccionar al login
      router.push("/admin/login");
    } catch (err: unknown) {
      console.error("[AdminDashboard] Error cerrando sesión:", err);
      alert("Error al cerrar sesión. Por favor, inténtelo de nuevo.");
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  // Lógica de filtrado en memoria
  const filteredVisits = useMemo(() => {
    return initialVisits.filter((visit) => {
      // 1. Filtrar por término de búsqueda (nombre, apellidos, DNI o acompañantes)
      const query = searchTerm.toLowerCase().trim();
      const matchMain = !query || (
        (visit.visitante?.nombre || "").toLowerCase().includes(query) ||
        (visit.visitante?.apellidos || "").toLowerCase().includes(query) ||
        (visit.visitante?.dni || "").toLowerCase().includes(query)
      );

      // Comprobar también si algún acompañante coincide con la búsqueda
      const matchAcompanante = !query || (
        (visit.acompanantes || []).some(
          (ac) =>
            ac.nombre.toLowerCase().includes(query) ||
            ac.apellidos.toLowerCase().includes(query) ||
            (ac.dni || "").toLowerCase().includes(query)
        )
      );

      // Comprobar también si la persona visitada o parentesco coincide
      const matchPersona = !query || (
        (visit.persona_visitada || "").toLowerCase().includes(query) ||
        (visit.parentesco || "").toLowerCase().includes(query)
      );

      const matchSearch = matchMain || matchAcompanante || matchPersona;

      // 2. Filtrar por fecha
      let matchDate = true;
      if (filterDate) {
        const visitDateObj = new Date(visit.created_at);
        const yyyy = visitDateObj.getFullYear();
        const mm = String(visitDateObj.getMonth() + 1).padStart(2, "0");
        const dd = String(visitDateObj.getDate()).padStart(2, "0");
        const visitDateStr = `${yyyy}-${mm}-${dd}`;

        matchDate = visitDateStr === filterDate;
      }

      return matchSearch && matchDate;
    });
  }, [initialVisits, searchTerm, filterDate]);

  // Formateador de fecha y hora local
  const formatDateTime = useCallback((isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  }, []);

  // Formateador de hora solamente
  const formatTimeOnly = useCallback((isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Cabecera del Panel */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/images/logo-residencial-sanesteban.png"
              alt="Logo"
              width={50}
              height={50}
              className="rounded-xl shadow-xs"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 font-serif">
                Residencial San Esteban
              </h1>
              <p className="text-xs text-gray-500">
                Panel de Registro de Visitas
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-5 py-2 rounded-xl border border-gray-300 hover:border-danger hover:text-danger text-gray-600 font-medium text-sm transition-colors active:scale-95 disabled:opacity-50"
          >
            {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Barra de Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs mb-8 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
            {/* Buscador de texto */}
            <div>
              <label htmlFor="search-input" className="field-label mb-1.5 block">
                Buscar visitante o acompañante
              </label>
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Nombre, apellidos o DNI..."
                className="input-field text-base py-2.5 px-4 h-12"
              />
            </div>

            {/* Selector de fecha */}
            <div>
              <label htmlFor="date-input" className="field-label mb-1.5 block">
                Filtrar por fecha
              </label>
              <input
                id="date-input"
                type="date"
                value={filterDate}
                onChange={handleDateChange}
                className="input-field text-base py-2.5 px-4 h-12"
              />
            </div>
          </div>

          {/* Botón de limpiar filtros */}
          {(searchTerm || filterDate) && (
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto h-12 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors active:scale-95 whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla / Grid de Visitas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
          {filteredVisits.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 19.127a9.26 9.26 0 005.12 1.455c1.71 0 3.32-.38 4.773-1.062m2.158-3.07A4.125 4.125 0 003 16.812a8.94 8.94 0 00-.33 1.82c-.066.654.414 1.208 1.07 1.208h10.094c.66 0 1.14-.555 1.07-1.208a8.94 8.94 0 00-.33-1.82z"
                />
              </svg>
              <p className="text-lg font-medium text-gray-700">No se encontraron visitas</p>
              <p className="text-sm text-gray-400 mt-1">
                Pruebe a cambiar el término de búsqueda o el filtro de fecha.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" role="table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-sm">
                    <th className="px-6 py-4">Entrada</th>
                    <th className="px-6 py-4">Salida</th>
                    <th className="px-6 py-4">Visitante</th>
                    <th className="px-6 py-4">DNI</th>
                    <th className="px-6 py-4">Visita a</th>
                    <th className="px-6 py-4">Acompañantes</th>
                    <th className="px-6 py-4">Firma Digital</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Hora de Entrada */}
                      <td className="px-6 py-5 font-medium text-gray-900 whitespace-nowrap">
                        {formatDateTime(visit.created_at)}
                      </td>

                      {/* Hora de Salida o Estado */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        {visit.fecha_salida ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">
                              {formatTimeOnly(visit.fecha_salida)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(visit.fecha_salida).toLocaleDateString("es-ES", {
                                dateStyle: "short",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            En el centro
                          </span>
                        )}
                      </td>

                      {/* Datos Visitante Principal */}
                      <td className="px-6 py-5">
                        {visit.visitante ? (
                          <div>
                            <p className="font-bold text-gray-800">
                              {visit.visitante.nombre} {visit.visitante.apellidos}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Desconocido</span>
                        )}
                      </td>

                      {/* DNI Principal */}
                      <td className="px-6 py-5 font-mono tracking-wider text-gray-800 whitespace-nowrap">
                        {visit.visitante?.dni || "—"}
                      </td>

                      {/* Persona a la que visita y parentesco */}
                      <td className="px-6 py-5">
                        {visit.persona_visitada ? (
                          <div>
                            <p className="font-semibold text-gray-800">
                              {visit.persona_visitada}
                            </p>
                            {visit.parentesco && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 mt-0.5">
                                {visit.parentesco}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Acompañantes */}
                      <td className="px-6 py-5">
                        {visit.acompanantes && visit.acompanantes.length > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
                              👥 {visit.acompanantes.length} acompañante{visit.acompanantes.length > 1 ? "s" : ""}
                            </span>
                            <div className="text-xs space-y-0.5">
                              {visit.acompanantes.map((ac, idx) => (
                                <div key={idx} className="text-gray-600">
                                  <span className="font-medium text-gray-800">
                                    {ac.nombre} {ac.apellidos}
                                  </span>
                                  {ac.dni ? (
                                    <span className="font-mono text-gray-400 ml-1">
                                      ({ac.dni})
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Ninguno</span>
                        )}
                      </td>

                      {/* Firma */}
                      <td className="px-6 py-5">
                        {visit.signatureUrl ? (
                          <button
                            onClick={() => setSelectedSignature(visit.signatureUrl)}
                            className="relative w-32 h-12 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in hover:border-primary transition-all flex items-center justify-center p-1"
                            title="Ampliar firma"
                          >
                            <img
                              src={visit.signatureUrl}
                              alt="Firma"
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Sin firma</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Firma Ampliada */}
      {selectedSignature && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 font-serif">
                Visualización de Firma
              </h3>
              <button
                onClick={() => setSelectedSignature(null)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="w-full h-64 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center p-4">
              <img
                src={selectedSignature}
                alt="Firma Ampliada"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSignature(null)}
                className="btn btn-secondary py-2 px-6 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * DOCUMENTACIÓN DE MEMORIA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Decisiones técnicas:
 * - Se añade la visualización de acompañantes y la hora de salida en la tabla
 *   sin sobrecargar la interfaz, usando badges compactos y texto secundario.
 * - Los acompañantes también se incluyen en la búsqueda de texto libre para que
 *   el recepcionista pueda encontrar una visita buscando el nombre o DNI de
 *   cualquiera de los acompañantes.
 * - Estado "En el centro" con indicador visual en tiempo real cuando la visita
 *   aún no ha registrado su salida.
 *
 * Edge cases cubiertos:
 * - Acompañantes vacíos o sin DNI: renderizado limpio sin paréntesis rotos.
 * - Formato de fecha de salida independiente de la entrada por si la visita
 *   se prolonga entre distintos días.
 */
