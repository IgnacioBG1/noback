"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { TREATMENT_CONSENT_FOR_ROUTE, consentDoc } from "@/content/consentimientos";
import { consentHash } from "@/content/hash";

export interface FirmaState {
  error?: string;
}

/** El paciente firma el consentimiento informado del tratamiento de su plan vigente. */
export async function firmarTratamiento(_prev: FirmaState, fd: FormData): Promise<FirmaState> {
  const s = await getSessionInfo();
  if (!s.userId || s.role !== "patient") return { error: "Acceso no permitido." };
  if (fd.get("acepto") !== "on") return { error: "Para continuar tienes que marcar la casilla." };

  const supabase = await createSupabaseServer();
  const { data: plan } = await supabase.from("care_plans").select("id, route").eq("patient_id", s.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan) return { error: "Todavía no tienes un plan asignado." };
  const doc = consentDoc(TREATMENT_CONSENT_FOR_ROUTE[plan.route as "farmaco" | "sin_farmaco"]);
  if (fd.get("kind") !== doc.kind || fd.get("version") !== doc.version) return { error: "El documento ha cambiado. Recarga la página y vuelve a leerlo." };

  const h = await headers();
  const { error } = await supabase.from("consents").insert({
    user_id: s.userId,
    kind: doc.kind,
    text_version: doc.version,
    granted: true,
    evidence: {
      canal: "web",
      sha256: consentHash(doc),
      plan_id: plan.id,
      user_agent: (h.get("user-agent") ?? "").slice(0, 300),
      ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    },
  });
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  revalidatePath("/paciente", "layout");
  redirect("/paciente/plan?firmado=1");
}
