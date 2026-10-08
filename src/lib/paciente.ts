import "server-only";
import { cache } from "react";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { estadoValoracion, type EstadoValoracion } from "@/lib/valoracion";
import { normalizaMedicion, type CarePlan, type Measurement } from "@/lib/historia";
import { TREATMENT_CONSENT_FOR_ROUTE, consentDoc } from "@/content/consentimientos";

export type ResumenPaciente = EstadoValoracion & {
  inscripcion: { phase: string; route: string | null; started_on: string } | null;
  plan: CarePlan | null;
  medidas: Measurement[];
  /** Consentimiento del tratamiento del plan vigente: firmado con la versión actual del texto. */
  consentimiento: { kind: "tratamiento_glp1" | "dieta_proteinada"; firmado: boolean; fecha: string | null } | null;
  equipo: { staff_role: string; first_name: string | null; last_name: string | null }[];
};

/** Todo lo que el paciente ve de sí mismo (RLS: solo lo suyo). Una vez por petición. */
export const getResumenPaciente = cache(async (): Promise<ResumenPaciente> => {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const uid = s.userId!;
  const [estado, { data: insc }, { data: planes }, { data: medidas }, { data: firmas }, { data: equipo }] = await Promise.all([
    estadoValoracion(supabase, uid),
    supabase.from("enrollments").select("phase, route, started_on").eq("patient_id", uid).order("started_on", { ascending: false }).limit(1),
    supabase.from("care_plans").select("*").eq("patient_id", uid).order("created_at", { ascending: false }).limit(1),
    supabase.from("measurements").select("*").eq("patient_id", uid).order("measured_at"),
    supabase.from("consents").select("kind, granted, text_version, created_at").eq("user_id", uid).in("kind", ["tratamiento_glp1", "dieta_proteinada"]).order("created_at", { ascending: false }),
    supabase.rpc("my_care_team"),
  ]);
  const plan = (planes?.[0] as CarePlan | undefined) ?? null;
  let consentimiento: ResumenPaciente["consentimiento"] = null;
  if (plan) {
    const kind = TREATMENT_CONSENT_FOR_ROUTE[plan.route];
    const ultima = (firmas ?? []).find((f) => f.kind === kind);
    const firmado = !!ultima?.granted && ultima.text_version === consentDoc(kind).version;
    consentimiento = { kind, firmado, fecha: firmado ? ultima!.created_at : null };
  }
  return {
    ...estado,
    inscripcion: insc?.[0] ?? null,
    plan,
    medidas: (medidas ?? []).map((m) => normalizaMedicion(m)),
    consentimiento,
    equipo: equipo ?? [],
  };
});

type Estado = "done" | "current" | "todo";
export function recorrido(r: ResumenPaciente) {
  const orden = ["consentimientos", "cuestionario", "pago", "recibida"] as const;
  const i = orden.indexOf(r.paso === "pendiente_pago" ? "pago" : r.paso);
  const st = (n: number): Estado => (i > n ? "done" : i === n ? "current" : "todo");
  const medido = r.medidas.length > 0;
  const plan = !!r.plan;
  const firmado = !!r.consentimiento?.firmado;
  return [
    { label: "Condiciones de la atención", state: st(0) },
    { label: "Cuestionario de salud", state: st(1) },
    { label: "Pago de la valoración", state: st(2) },
    { label: "Analítica y medición inicial", detail: i === 3 && !medido && !plan ? "Te contactaremos para organizarla" : undefined, state: medido || plan ? "done" : i === 3 ? "current" : "todo" },
    { label: "Consulta con tu médico", state: plan ? "done" : i === 3 && medido ? "current" : "todo" },
    { label: "Firma del consentimiento de tu tratamiento", state: firmado ? "done" : plan ? "current" : "todo" },
    { label: "Tu plan en marcha", state: firmado ? "current" : "todo" },
  ] as { label: string; detail?: string; state: Estado }[];
}
