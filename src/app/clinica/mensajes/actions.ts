"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { enviarSalidas } from "@/lib/agente/motor";

export interface RespuestaState {
  ok?: string;
  error?: string;
}

const schema = z.object({
  patient_id: z.uuid(),
  escalation_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  texto: z.string().trim().min(1, "Escribe la respuesta").max(2000),
  cerrar: z.string().optional(),
});

/** El médico responde al paciente por su canal (WhatsApp o chat) y marca el escalado como respondido. */
export async function responderPaciente(_prev: RespuestaState, fd: FormData): Promise<RespuestaState> {
  const s = await getSessionInfo();
  if (!s.userId || s.role === "patient" || s.aal !== "aal2") return { error: "Necesitas acceder con doble factor." };
  const v = schema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { error: v.error.issues[0].message };
  const supabase = await createSupabaseServer();

  // Comprobación de permiso con RLS: solo el médico asignado o admin puede escribir como «staff».
  const { data: ultimo } = await supabase.from("messages").select("channel").eq("patient_id", v.data.patient_id).eq("direction", "in").order("created_at", { ascending: false }).limit(1);
  const { data: puede } = await supabase.rpc("get_patient_card", { p_patient: v.data.patient_id });
  if (!puede?.length || !(s.role === "admin" || s.role === "doctor")) return { error: "No tienes permiso para responder a este paciente." };

  const canal = (ultimo?.[0]?.channel as "whatsapp" | "web" | undefined) ?? "web";
  await enviarSalidas(createSupabaseAdmin(), v.data.patient_id, canal, [{ texto: v.data.texto }], "staff", s.userId);
  if (v.data.escalation_id) {
    const { error } = await supabase.from("escalations").update({ status: "respondida" }).eq("id", v.data.escalation_id);
    if (error) console.error("escalado", error.message);
  }
  revalidatePath("/clinica", "layout");
  // Desde la bandeja, el escalado deja de estar pendiente: volvemos con una confirmación visible.
  if (v.data.escalation_id && fd.get("desde") === "bandeja") redirect(`/clinica/mensajes?respondido=${canal}`);
  return { ok: canal === "whatsapp" ? "Enviado por WhatsApp." : "Enviado al chat del paciente." };
}

export async function cerrarEscalado(fd: FormData) {
  const s = await getSessionInfo();
  if (!s.userId || s.role === "patient" || s.aal !== "aal2") return;
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createSupabaseServer();
  await supabase.from("escalations").update({ status: "cerrada" }).eq("id", id.data);
  revalidatePath("/clinica", "layout");
}
