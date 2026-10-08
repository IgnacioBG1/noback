import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REQUIRED_CONSENTS, type ConsentKind } from "@/content/consentimientos";

export type Paso = "consentimientos" | "cuestionario" | "pago" | "pendiente_pago" | "recibida";

export interface EstadoValoracion {
  paso: Paso;
  consents: Partial<Record<ConsentKind, boolean>>;
  profile: { first_name: string | null; last_name: string | null; birth_date: string | null; sex: string | null } | null;
  intake: { status: "borrador" | "enviado"; answers: Record<string, unknown>; submitted_at: string | null } | null;
  pago: { status: string; paid_at: string | null } | null;
}

/** Estado de la valoración del paciente autenticado (todo con RLS: solo ve lo suyo). */
export async function estadoValoracion(supabase: SupabaseClient, userId: string): Promise<EstadoValoracion> {
  const [{ data: consentRows }, { data: profile }, { data: intake }, { data: pagos }] = await Promise.all([
    supabase.from("consents").select("kind, granted, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("first_name, last_name, birth_date, sex").eq("id", userId).maybeSingle(),
    supabase.from("intake_forms").select("status, answers, submitted_at").eq("patient_id", userId).maybeSingle(),
    supabase
      .from("payments")
      .select("status, paid_at, created_at")
      .eq("patient_id", userId)
      .eq("concept", "valoracion")
      .order("created_at", { ascending: false }),
  ]);

  // El último registro de cada tipo manda (otorgar y revocar son registros sucesivos).
  const consents: Partial<Record<ConsentKind, boolean>> = {};
  for (const r of consentRows ?? []) if (!(r.kind in consents)) consents[r.kind as ConsentKind] = r.granted;

  const pagado = (pagos ?? []).find((p) => p.status === "pagado") ?? null;
  const pendiente = (pagos ?? []).find((p) => p.status === "pendiente") ?? null;

  let paso: Paso;
  if (!REQUIRED_CONSENTS.every((k) => consents[k])) paso = "consentimientos";
  else if (!intake || intake.status !== "enviado" || !profile?.birth_date || !profile?.sex) paso = "cuestionario";
  else if (pagado) paso = "recibida";
  else if (pendiente) paso = "pendiente_pago";
  else paso = "pago";

  return {
    paso,
    consents,
    profile: profile ?? null,
    intake: intake ? { status: intake.status, answers: (intake.answers ?? {}) as Record<string, unknown>, submitted_at: intake.submitted_at } : null,
    pago: pagado ?? pendiente ?? null,
  };
}
