"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { cambioFaseSchema, erroresDe } from "@/content/consulta";

export interface FaseState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** El médico sitúa al paciente en otra fase Essential sin abrir una consulta completa. */
export async function cambiarFase(_prev: FaseState, fd: FormData): Promise<FaseState> {
  const s = await getSessionInfo();
  if (!s.userId || s.role === "patient" || s.aal !== "aal2") return { error: "Necesitas acceder con doble factor." };
  const v = cambioFaseSchema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { error: "Revisa los campos marcados.", fieldErrors: erroresDe(v.error) };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc("cambiar_fase", {
    p_patient: v.data.patient_id,
    p_fase: v.data.fase_dieta,
    p_productos_dia: v.data.productos_dia ?? null,
    p_periodo_dias: v.data.periodo_dias ?? null,
    p_mixto_opcion: v.data.mixto_opcion ?? null,
  });
  if (error) {
    console.error("cambiar_fase", error.message);
    return { error: error.code === "42501" ? "No tienes permiso para este paciente." : "No se ha podido cambiar la fase." };
  }
  revalidatePath(`/clinica/pacientes/${v.data.patient_id}`);
  return { ok: true };
}
