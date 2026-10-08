import "server-only";
import { cache } from "react";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";

export type Pendiente = { patient_id: string; first_name: string | null; last_name: string | null; submitted_at: string | null; paid_at: string | null };
export type PacienteFila = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  sex: string | null;
  birth_date: string | null;
  created_at: string;
  phase: string | null;
  route: string | null;
  started_on: string | null;
};

export { PHASE_LABEL, ROUTE_LABEL } from "./clinica-labels";

/** Una sola llamada (y un solo registro de auditoría) por petición aunque la usen layout y página. */
export const getPendientes = cache(async (): Promise<Pendiente[]> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("list_pending_assessments");
  return (data ?? []) as Pendiente[];
});

/** Pacientes que este profesional puede ver (RLS: asignados, o todos si es administrador). */
export const getPacientes = cache(async (): Promise<PacienteFila[]> => {
  const supabase = await createSupabaseServer();
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, sex, birth_date, created_at")
    .eq("role", "patient")
    .order("created_at", { ascending: false });
  const ids = (perfiles ?? []).map((p) => p.id);
  const { data: insc } = ids.length
    ? await supabase.from("enrollments").select("patient_id, phase, route, started_on, ended_on").in("patient_id", ids).order("started_on", { ascending: false })
    : { data: [] as { patient_id: string; phase: string; route: string | null; started_on: string; ended_on: string | null }[] };
  const ultima = new Map<string, { phase: string; route: string | null; started_on: string }>();
  for (const e of insc ?? []) if (!ultima.has(e.patient_id)) ultima.set(e.patient_id, e);
  return (perfiles ?? []).map((p) => {
    const e = ultima.get(p.id);
    return { ...p, phase: e?.phase ?? null, route: e?.route ?? null, started_on: e?.started_on ?? null };
  });
});

export const getStaff = cache(async () => {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", s.userId!).maybeSingle();
  return { role: s.role, first_name: data?.first_name ?? null, last_name: data?.last_name ?? null };
});

export const ROLE_LABEL: Record<string, string> = { admin: "Administración", doctor: "Médico", trainer: "Entrenador" };

export function diasDesde(iso: string | null, hoy = new Date()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((hoy.getTime() - new Date(iso).getTime()) / 86_400_000));
}
