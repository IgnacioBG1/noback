import "server-only";
import { cache } from "react";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { estadoValoracion, type EstadoValoracion } from "@/lib/valoracion";

export type ResumenPaciente = EstadoValoracion & {
  inscripcion: { phase: string; route: string | null; started_on: string } | null;
};

/** Todo lo que el paciente ve de sí mismo (RLS: solo lo suyo). Una vez por petición. */
export const getResumenPaciente = cache(async (): Promise<ResumenPaciente> => {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const [estado, { data: insc }] = await Promise.all([
    estadoValoracion(supabase, s.userId!),
    supabase.from("enrollments").select("phase, route, started_on").eq("patient_id", s.userId!).order("started_on", { ascending: false }).limit(1),
  ]);
  return { ...estado, inscripcion: insc?.[0] ?? null };
});

export function recorrido(r: ResumenPaciente) {
  const orden = ["consentimientos", "cuestionario", "pago", "recibida"] as const;
  const i = orden.indexOf(r.paso === "pendiente_pago" ? "pago" : r.paso);
  const st = (n: number) => (i > n ? "done" : i === n ? "current" : "todo") as "done" | "current" | "todo";
  const tienePlan = !!r.inscripcion?.route;
  return [
    { label: "Condiciones de la atención", state: st(0) },
    { label: "Cuestionario de salud", state: st(1) },
    { label: "Pago de la valoración", state: st(2) },
    { label: "Analítica y medición inicial", detail: i === 3 && !tienePlan ? "Te contactaremos para organizarla" : undefined, state: tienePlan ? "done" : i === 3 ? "current" : "todo" },
    { label: "Consulta con tu médico", state: tienePlan ? "done" : "todo" },
    { label: "Tu plan personalizado", state: tienePlan ? "current" : "todo" },
  ] as { label: string; detail?: string; state: "done" | "current" | "todo" }[];
}
