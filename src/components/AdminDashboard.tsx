"use client";

/**
 * @file AdminDashboard.tsx
 * @description Componente cliente interactivo del Panel de Administración de visitas.
 *
 * Proporciona:
 * 1. Métricas superiores en 3 Cards:
 *    - Card 1: Entradas hoy abiertas (visitas activas y acompañantes).
 *    - Card 2: Salidas pendientes acumuladas con lupa para gestionar cierres (individual/múltiple).
 *    - Card 3: Residentes en salida acumulados con lupa para registrar reingresos (individual/múltiple).
 * 2. Búsquedas y filtros en tiempo real por texto (visitante, acompañante, residente) y fecha.
 * 3. Tabla histórica con detalle de salida y estado del residente (si salió y si regresó).
 * 4. Modales interactivos para visualización de firma, cierre de salidas y reingreso de residentes.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_BASE } from "@/lib/api";
import { VisitaData } from "@/app/admin/page";

// ── 1. Interfaces ────────────────────────────────────────────────────────────
interface AdminDashboardProps {
  initialVisits: VisitaData[];
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  count?: number;
  visita_ids?: string[];
  fecha_salida?: string;
  fecha_regreso_residente?: string;
}

// ── 2. Component Logic & Render ──────────────────────────────────────────────
export default function AdminDashboard({ initialVisits }: AdminDashboardProps) {
  const router = useRouter();

  // Estado mutable local para visitas (permite actualización optimista/inmediata al cerrar)
  const [visits, setVisits] = useState<VisitaData[]>(initialVisits);

  // Sincronizar estado cuando initialVisits se actualice por revalidación de Next.js
  useEffect(() => {
    setVisits(initialVisits);
  }, [initialVisits]);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Estados de modales
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [modalSalidasOpen, setModalSalidasOpen] = useState<boolean>(false);
  const [modalResidentesOpen, setModalResidentesOpen] = useState<boolean>(false);

  // Estados de selección para acciones por lotes
  const [selectedSalidaIds, setSelectedSalidaIds] = useState<string[]>([]);
  const [selectedResidenteIds, setSelectedResidenteIds] = useState<string[]>([]);

  // Estados de carga para operaciones asíncronas
  const [isProcessingSalidas, setIsProcessingSalidas] = useState<boolean>(false);
  const [isProcessingResidentes, setIsProcessingResidentes] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  // ── Métricas de los 3 Cards ───────────────────────────────────────────────

  /**
   * Helper para comprobar si una fecha ISO corresponde al día de hoy en hora local
   */
  const isToday = useCallback((isoString: string): boolean => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  }, []);

  // Card 1: Entradas hoy que sigan abiertas (!fecha_salida)
  const entradasHoyAbiertas = useMemo(() => {
    return visits.filter((v) => isToday(v.created_at) && !v.fecha_salida);
  }, [visits, isToday]);

  const countEntradasHoyVisitas = entradasHoyAbiertas.length;
  const countEntradasHoyAcompanantes = useMemo(() => {
    return entradasHoyAbiertas.reduce(
      (acc, v) => acc + (v.acompanantes ? v.acompanantes.length : 0),
      0
    );
  }, [entradasHoyAbiertas]);

  // Card 2: Salidas pendientes acumuladas en todo el histórico (!fecha_salida)
  const salidasPendientes = useMemo(() => {
    return visits.filter((v) => !v.fecha_salida);
  }, [visits]);

  // Card 3: Residentes en salida acumulados (residente_sale === true && !residente_regresado)
  const residentesEnSalida = useMemo(() => {
    return visits.filter((v) => v.residente_sale === true && !v.residente_regresado);
  }, [visits]);

  // ── Manejadores de Filtros ────────────────────────────────────────────────
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterDate("");
  }, []);

  // ── Filtrado en memoria para la tabla principal ───────────────────────────
  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const query = searchTerm.toLowerCase().trim();
      const matchMain = !query || (
        (visit.visitante?.nombre || "").toLowerCase().includes(query) ||
        (visit.visitante?.apellidos || "").toLowerCase().includes(query) ||
        (visit.visitante?.dni || "").toLowerCase().includes(query)
      );

      const matchAcompanante = !query || (
        (visit.acompanantes || []).some(
          (ac) =>
            ac.nombre.toLowerCase().includes(query) ||
            ac.apellidos.toLowerCase().includes(query) ||
            (ac.dni || "").toLowerCase().includes(query)
        )
      );

      const matchPersona = !query || (
        (visit.persona_visitada || "").toLowerCase().includes(query) ||
        (visit.parentesco || "").toLowerCase().includes(query)
      );

      const matchSearch = matchMain || matchAcompanante || matchPersona;

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
  }, [visits, searchTerm, filterDate]);

  // ── Formateadores de fecha y hora ─────────────────────────────────────────
  const formatDateTime = useCallback((isoString: string): string => {
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

  const formatTimeOnly = useCallback((isoString: string): string => {
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

  // ── Cerrar Sesión ─────────────────────────────────────────────────────────
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

      router.push("/admin/login");
    } catch (err: unknown) {
      console.error("[AdminDashboard] Error cerrando sesión:", err);
      alert("Error al cerrar sesión. Por favor, inténtelo de nuevo.");
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  // ── Acciones de Cierre de Salidas Pendientes (Card 2) ──────────────────────

  const handleToggleSelectSalida = useCallback((id: string) => {
    setSelectedSalidaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllSalidas = useCallback(() => {
    if (selectedSalidaIds.length === salidasPendientes.length) {
      setSelectedSalidaIds([]);
    } else {
      setSelectedSalidaIds(salidasPendientes.map((v) => v.id));
    }
  }, [selectedSalidaIds.length, salidasPendientes]);

  const handleCerrarSalidas = useCallback(
    async (idsToClose: string[]) => {
      if (idsToClose.length === 0 || isProcessingSalidas) return;
      setIsProcessingSalidas(true);

      try {
        const res = await fetch(`${API_BASE}/admin/visitas/cerrar-salida`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visita_ids: idsToClose }),
        });

        const data = (await res.json()) as ApiResponse;

        if (!res.ok) {
          throw new Error(data.error || "Error al cerrar las salidas seleccionadas");
        }

        const nowIso = data.fecha_salida || new Date().toISOString();

        // Actualización local inmediata
        setVisits((prev) =>
          prev.map((v) =>
            idsToClose.includes(v.id) ? { ...v, fecha_salida: nowIso } : v
          )
        );

        // Deseleccionar los IDs procesados
        setSelectedSalidaIds((prev) => prev.filter((id) => !idsToClose.includes(id)));

        // Refrescar en segundo plano para sincronizar con el servidor
        router.refresh();
      } catch (err: unknown) {
        console.error("[AdminDashboard] Error al cerrar salidas:", err);
        alert(
          err instanceof Error
            ? err.message
            : "No se pudieron cerrar las salidas seleccionadas."
        );
      } finally {
        setIsProcessingSalidas(false);
      }
    },
    [isProcessingSalidas, router]
  );

  // ── Acciones de Regreso de Residentes (Card 3) ─────────────────────────────

  const handleToggleSelectResidente = useCallback((id: string) => {
    setSelectedResidenteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllResidentes = useCallback(() => {
    if (selectedResidenteIds.length === residentesEnSalida.length) {
      setSelectedResidenteIds([]);
    } else {
      setSelectedResidenteIds(residentesEnSalida.map((v) => v.id));
    }
  }, [selectedResidenteIds.length, residentesEnSalida]);

  const handleCerrarRegresoResidentes = useCallback(
    async (idsToClose: string[]) => {
      if (idsToClose.length === 0 || isProcessingResidentes) return;
      setIsProcessingResidentes(true);

      try {
        const res = await fetch(`${API_BASE}/admin/visitas/cerrar-regreso-residente`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visita_ids: idsToClose }),
        });

        const data = (await res.json()) as ApiResponse;

        if (!res.ok) {
          throw new Error(
            data.error || "Error al registrar el regreso de los residentes"
          );
        }

        const nowIso = data.fecha_regreso_residente || new Date().toISOString();

        // Actualización local inmediata
        setVisits((prev) =>
          prev.map((v) =>
            idsToClose.includes(v.id)
              ? { ...v, residente_regresado: true, fecha_regreso_residente: nowIso }
              : v
          )
        );

        // Deseleccionar los IDs procesados
        setSelectedResidenteIds((prev) =>
          prev.filter((id) => !idsToClose.includes(id))
        );

        // Refrescar en segundo plano
        router.refresh();
      } catch (err: unknown) {
        console.error("[AdminDashboard] Error al registrar regreso:", err);
        alert(
          err instanceof Error
            ? err.message
            : "No se pudo registrar el regreso de los residentes seleccionados."
        );
      } finally {
        setIsProcessingResidentes(false);
      }
    },
    [isProcessingResidentes, router]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Cabecera del Panel */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
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
              <p className="text-xs text-gray-500 font-medium">
                Panel de Registro y Control de Visitas
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
        {/* ── 3 Cards Superiores de Resumen / KPIs ─────────────────────────── */}
        <section
          aria-label="Métricas de control de visitas"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Card 1: Entradas Hoy (Solo las que sigan abiertas) */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Hoy en el centro
                </span>
                <h2 className="text-base font-bold text-gray-700 font-sans">
                  Entradas hoy abiertas
                </h2>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100">
                👥
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {countEntradasHoyVisitas}
                </span>
                <span className="text-sm text-gray-500 ml-1.5 font-medium">
                  {countEntradasHoyVisitas === 1 ? "visita activa" : "visitas activas"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  +{countEntradasHoyAcompanantes} {countEntradasHoyAcompanantes === 1 ? "acompañante" : "acompañantes"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Salidas Pendientes Acumuladas (Con Lupa) */}
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                  Histórico acumulado
                </span>
                <h2 className="text-base font-bold text-gray-700 font-sans">
                  Salidas pendientes
                </h2>
              </div>

              {/* Botón de Lupa para abrir modal de gestión de salidas */}
              <button
                type="button"
                onClick={() => setModalSalidasOpen(true)}
                className="w-11 h-11 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 transition-all active:scale-95 shadow-xs cursor-pointer group"
                title="Ver y gestionar salidas pendientes"
                aria-label="Abrir gestión de salidas pendientes"
              >
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {salidasPendientes.length}
                </span>
                <span className="text-sm text-gray-500 ml-1.5 font-medium">
                  {salidasPendientes.length === 1 ? "sin cerrar" : "sin cerrar"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalSalidasOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 flex items-center gap-1"
              >
                Gestionar salidas →
              </button>
            </div>
          </div>

          {/* Card 3: Residentes en Salida Acumulados (Con Lupa) */}
          <div
            className={`bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between ${
              residentesEnSalida.length > 0 ? "border-amber-200 bg-amber-50/20" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2 ${
                    residentesEnSalida.length > 0
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {residentesEnSalida.length > 0 ? "⚠️ En el exterior" : "Sin salidas activas"}
                </span>
                <h2 className="text-base font-bold text-gray-700 font-sans">
                  Residentes en salida
                </h2>
              </div>

              {/* Botón de Lupa para abrir modal de regreso de residentes */}
              <button
                type="button"
                onClick={() => setModalResidentesOpen(true)}
                className="w-11 h-11 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 transition-all active:scale-95 shadow-xs cursor-pointer group"
                title="Ver y marcar regreso de residentes"
                aria-label="Abrir gestión de regreso de residentes"
              >
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline justify-between">
              <div>
                <span
                  className={`text-3xl font-extrabold tracking-tight ${
                    residentesEnSalida.length > 0 ? "text-amber-800" : "text-gray-900"
                  }`}
                >
                  {residentesEnSalida.length}
                </span>
                <span className="text-sm text-gray-500 ml-1.5 font-medium">
                  {residentesEnSalida.length === 1 ? "fuera del centro" : "fuera del centro"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalResidentesOpen(true)}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 flex items-center gap-1"
              >
                Gestionar regresos →
              </button>
            </div>
          </div>
        </section>

        {/* ── Barra de Filtros ─────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs mb-8 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
            {/* Buscador de texto */}
            <div>
              <label htmlFor="search-input" className="field-label mb-1.5 block">
                Buscar visitante, acompañante o residente
              </label>
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Nombre, apellidos, DNI o residente..."
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
              className="w-full md:w-auto h-12 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors active:scale-95 whitespace-nowrap cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Tabla Principal de Visitas ───────────────────────────────────── */}
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

                      {/* Hora de Salida y Detalle del Residente */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        {visit.fecha_salida ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800">
                                {formatTimeOnly(visit.fecha_salida)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(visit.fecha_salida).toLocaleDateString("es-ES", {
                                  dateStyle: "short",
                                })}
                              </span>
                            </div>

                            {/* Detalle si el residente salió o no */}
                            {visit.residente_sale ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                                  <span>🚶</span> Salió: {visit.persona_visitada || "Residente"}
                                </span>
                                {visit.residente_regresado ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                                    ✓ Regresó{" "}
                                    {visit.fecha_regreso_residente
                                      ? `(${formatTimeOnly(visit.fecha_regreso_residente)})`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 w-fit animate-pulse">
                                    ● En el exterior
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 w-fit">
                                Solo visitantes
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              En el centro
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCerrarSalidas([visit.id])}
                              disabled={isProcessingSalidas}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline text-left w-fit mt-0.5"
                            >
                              Cerrar salida ahora
                            </button>
                          </div>
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

      {/* ── Modal 1: Salidas Pendientes Acumuladas ──────────────────────────── */}
      {modalSalidasOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-salidas-title"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            {/* Cabecera del modal */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg">
                  🚪
                </div>
                <div>
                  <h3
                    id="modal-salidas-title"
                    className="text-xl font-bold text-gray-800 font-serif"
                  >
                    Gestión de Salidas Pendientes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Visitas registradas que no cerraron su salida en el tótem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalSalidasOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg transition-colors active:scale-95 cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Barra de acciones de lote */}
            <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    salidasPendientes.length > 0 &&
                    selectedSalidaIds.length === salidasPendientes.length
                  }
                  onChange={handleSelectAllSalidas}
                  disabled={salidasPendientes.length === 0}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Seleccionar todas ({salidasPendientes.length})
                </span>
              </label>

              {selectedSalidaIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleCerrarSalidas(selectedSalidaIds)}
                  disabled={isProcessingSalidas}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingSalidas
                    ? "Cerrando..."
                    : `Cerrar salida a ${selectedSalidaIds.length} seleccionada${selectedSalidaIds.length > 1 ? "s" : ""}`}
                </button>
              )}
            </div>

            {/* Lista de visitas sin salida */}
            <div className="flex-1 overflow-y-auto p-6">
              {salidasPendientes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-base font-semibold text-gray-700">
                    🎉 ¡No hay salidas pendientes!
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Todas las visitas registradas han completado su salida correctamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salidasPendientes.map((v) => {
                    const isSelected = selectedSalidaIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-blue-50/40 border-blue-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSalida(v.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">
                                {v.visitante ? `${v.visitante.nombre} ${v.visitante.apellidos}` : "Visitante"}
                              </span>
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {v.visitante?.dni || "—"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span>
                                🕒 Entrada: <strong>{formatDateTime(v.created_at)}</strong>
                              </span>
                              {v.persona_visitada && (
                                <span>
                                  👤 Visita a: <strong>{v.persona_visitada}</strong> ({v.parentesco || "Familiar"})
                                </span>
                              )}
                              {v.acompanantes && v.acompanantes.length > 0 && (
                                <span className="text-blue-700 font-medium">
                                  +{v.acompanantes.length} acompañante{v.acompanantes.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCerrarSalidas([v.id])}
                          disabled={isProcessingSalidas}
                          className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:border-blue-600 hover:text-blue-600 text-gray-700 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                        >
                          Cerrar salida
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalSalidasOpen(false)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold transition-colors cursor-pointer"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Residentes en Salida Acumulados ────────────────────────── */}
      {modalResidentesOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-residentes-title"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            {/* Cabecera del modal */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-lg">
                  🚶
                </div>
                <div>
                  <h3
                    id="modal-residentes-title"
                    className="text-xl font-bold text-gray-800 font-serif"
                  >
                    Control de Residentes en el Exterior
                  </h3>
                  <p className="text-xs text-gray-500">
                    Residentes que salieron del centro y continúan marcados como fuera
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalResidentesOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg transition-colors active:scale-95 cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Barra de acciones de lote */}
            <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    residentesEnSalida.length > 0 &&
                    selectedResidenteIds.length === residentesEnSalida.length
                  }
                  onChange={handleSelectAllResidentes}
                  disabled={residentesEnSalida.length === 0}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  Seleccionar todos ({residentesEnSalida.length})
                </span>
              </label>

              {selectedResidenteIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleCerrarRegresoResidentes(selectedResidenteIds)}
                  disabled={isProcessingResidentes}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingResidentes
                    ? "Registrando..."
                    : `Marcar regreso de ${selectedResidenteIds.length} residente${selectedResidenteIds.length > 1 ? "s" : ""}`}
                </button>
              )}
            </div>

            {/* Lista de residentes fuera */}
            <div className="flex-1 overflow-y-auto p-6">
              {residentesEnSalida.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-base font-semibold text-gray-700">
                    🏡 Todos los residentes están dentro del centro
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    No consta ningún residente en el exterior en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {residentesEnSalida.map((v) => {
                    const isSelected = selectedResidenteIds.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-amber-50/50 border-amber-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectResidente(v.id)}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-950 text-base">
                                {v.persona_visitada || "Residente"}
                              </span>
                              {v.parentesco && (
                                <span className="text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                                  {v.parentesco}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span>
                                🚶 Salió con: <strong>{v.visitante ? `${v.visitante.nombre} ${v.visitante.apellidos}` : "Visitante"}</strong> ({v.visitante?.dni || "—"})
                              </span>
                              <span>
                                🕒 Hora salida: <strong>{v.fecha_salida ? formatDateTime(v.fecha_salida) : formatDateTime(v.created_at)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCerrarRegresoResidentes([v.id])}
                          disabled={isProcessingResidentes}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-xs"
                        >
                          Marcar regreso
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setModalResidentesOpen(false)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold transition-colors cursor-pointer"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Firma Ampliada ────────────────────────────────────────── */}
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
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg transition-colors active:scale-95 cursor-pointer"
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
                className="btn btn-secondary py-2 px-6 text-sm cursor-pointer"
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
 * - Implementación de 3 Cards de KPIs superiores:
 *   1. Entradas hoy abiertas: calcula visitas iniciadas hoy según la fecha local
 *      del cliente que sigan activas (sin fecha_salida), más el sumatorio de acompañantes.
 *   2. Salidas pendientes: cálculo acumulado en todo el histórico de visitas no cerradas,
 *      con botón lupa interactivo que abre un modal con selección única o múltiple
 *      para ejecutar el cierre masivo o unitario llamando a /api/admin/visitas/cerrar-salida.
 *   3. Residentes en salida: cálculo acumulado de visitas donde el residente salió
 *      (residente_sale === true) y aún no consta como regresado (!residente_regresado),
 *      con botón lupa para marcar el regreso al centro llamando a /api/admin/visitas/cerrar-regreso-residente.
 * - En la tabla principal, la columna "Salida" ahora especifica claramente el nombre
 *   del residente si salió ("🚶 Salió: [Nombre]") y su estado de reingreso ("✓ Regresó" vs "● En el exterior").
 * - Actualización de estado local inmediata y optimista para que la interfaz responda al instante,
 *   acompañada de un `router.refresh()` en segundo plano para sincronizar el estado del servidor.
 *
 * Edge cases cubiertos:
 * - Visitas abiertas sin acompañantes: conteo seguro sin producir NaN ni desbordamiento.
 * - Selección de "todas": desactiva el botón si no hay elementos pendientes para evitar payloads vacíos.
 * - Soporte total de TypeScript estricto: cero tipos `any`, interfaces tipadas para payloads y respuestas de API.
 */
