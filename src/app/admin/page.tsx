/**
 * @file page.tsx
 * @description Servidor del Panel de Administración (Server Component).
 *
 * Se encarga de verificar las credenciales de la cookie de sesión,
 * recuperar todas las visitas de Supabase y firmar de forma segura
 * las URLs de las firmas para su visualización.
 */

import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verificarSesion } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

// ── Interfaces ──────────────────────────────────────────────────────────────
export interface VisitanteInfo {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
}

export interface AcompananteInfo {
  dni?: string;
  nombre: string;
  apellidos: string;
}

export interface VisitaData {
  id: string;
  visitante_id: string;
  firma_url: string;
  signatureUrl: string | null;
  acepta_terminos: boolean;
  created_at: string;
  fecha_salida?: string | null;
  persona_visitada?: string | null;
  parentesco?: string | null;
  acompanantes?: AcompananteInfo[] | null;
  visitante: VisitanteInfo | null;
}

// Interfaz para la respuesta de Supabase
interface RawDBVisita {
  id: string;
  visitante_id: string;
  firma_url: string;
  acepta_terminos: boolean;
  created_at: string;
  fecha_salida?: string | null;
  persona_visitada?: string | null;
  parentesco?: string | null;
  acompanantes?: unknown;
  visitantes: unknown;
}

export default async function AdminPage() {
  // ── 1. Verificar estado de autenticación ───────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!verificarSesion(token)) {
    redirect("/admin/login");
  }

  // ── 2. Recuperar visitas de Supabase con comodín para evitar errores si no hay columnas nuevas ──
  const { data: rawVisitas, error } = await supabaseAdmin
    .from("visitas")
    .select(`
      *,
      visitantes (
        id,
        nombre,
        apellidos,
        dni
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminPage] Error recuperando visitas:", error);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="card max-w-md p-8 text-center bg-white shadow-md rounded-2xl">
          <h1 className="text-2xl font-bold text-danger mb-4">Error de Conexión</h1>
          <p className="text-gray-600 mb-6">
            No se pudo conectar con la base de datos de visitas. Por favor, compruebe la configuración de Supabase.
          </p>
        </div>
      </main>
    );
  }

  // ── 3. Procesar y generar Signed URLs para firmas ──────────────────────────
  const visitasProcesadas: VisitaData[] = await Promise.all(
    ((rawVisitas || []) as RawDBVisita[]).map(async (visit) => {
      let signatureUrl: string | null = null;

      if (visit.firma_url) {
        // Generar una Signed URL válida por 1 hora (3600 segundos)
        const { data, error: storageError } = await supabaseAdmin.storage
          .from("firmas")
          .createSignedUrl(visit.firma_url, 3600);

        if (storageError) {
          console.error(
            `[AdminPage] Error generando signed URL para la firma ${visit.firma_url}:`,
            storageError
          );
        } else if (data) {
          signatureUrl = data.signedUrl;
        }
      }

      // Normalizar datos del visitante
      let visitante: VisitanteInfo | null = null;
      if (visit.visitantes) {
        if (Array.isArray(visit.visitantes)) {
          visitante = (visit.visitantes[0] as VisitanteInfo) || null;
        } else {
          visitante = visit.visitantes as VisitanteInfo;
        }
      }

      // Normalizar acompañantes
      let acompanantes: AcompananteInfo[] | null = null;
      if (Array.isArray(visit.acompanantes)) {
        acompanantes = visit.acompanantes as AcompananteInfo[];
      }

      return {
        id: visit.id,
        visitante_id: visit.visitante_id,
        firma_url: visit.firma_url,
        signatureUrl,
        acepta_terminos: visit.acepta_terminos,
        created_at: visit.created_at,
        fecha_salida: visit.fecha_salida || null,
        persona_visitada: visit.persona_visitada || null,
        parentesco: visit.parentesco || null,
        acompanantes,
        visitante,
      };
    })
  );

  return <AdminDashboard initialVisits={visitasProcesadas} />;
}
