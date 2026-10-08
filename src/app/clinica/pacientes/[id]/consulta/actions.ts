"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { encuentroSchema, erroresDe, madridAIso, medicionSchema, planSchema } from "@/content/consulta";

export interface ConsultaState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registrarConsulta(_prev: ConsultaState, fd: FormData): Promise<ConsultaState> {
  const s = await getSessionInfo();
  if (!s.userId || !s.role || s.role === "patient" || s.aal !== "aal2") return { error: "Necesitas acceder con doble factor." };

  const patient = z.uuid().safeParse(fd.get("patient_id"));
  if (!patient.success) return { error: "Paciente no válido." };
  const raw = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

  const enc = encuentroSchema.safeParse(raw);
  const med = medicionSchema.safeParse(raw);
  const conPlan = raw.asignar_plan === "on";
  const plan = conPlan ? planSchema.safeParse(raw) : null;
  const fieldErrors = {
    ...(enc.success ? {} : erroresDe(enc.error)),
    ...(med.success ? {} : erroresDe(med.error)),
    ...(plan && !plan.success ? erroresDe(plan.error) : {}),
  };
  if (!enc.success || !med.success || (plan && !plan.success)) return { error: "Revisa los campos marcados.", fieldErrors };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("registrar_consulta", {
    p_patient: patient.data,
    p_encounter: { ...enc.data, occurred_at: madridAIso(enc.data.occurred_at) },
    p_measurement: med.data,
    p_plan: plan?.success ? plan.data : null,
  });
  if (error) {
    console.error("registrar_consulta", error.code, error.message);
    return { error: error.code === "42501" ? "No tienes permiso para registrar consultas de este paciente." : "No se ha podido guardar. Inténtalo de nuevo." };
  }
  revalidatePath(`/clinica/pacientes/${patient.data}`);
  redirect(`/clinica/pacientes/${patient.data}?guardado=1`);
}
