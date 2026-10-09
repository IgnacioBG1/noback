"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { procesarEntrada } from "@/lib/agente/motor";
import { enlaceWhatsApp, generarCodigo } from "@/lib/agente/vincular";
import { criptoConfigurado } from "@/lib/cripto";

async function paciente() {
  const s = await getSessionInfo();
  if (!s.userId || s.role !== "patient") throw new Error("Acceso no permitido");
  return s.userId;
}

export interface ChatState {
  error?: string;
}

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function enviarAlAsistente(_prev: ChatState, fd: FormData): Promise<ChatState> {
  const patientId = await paciente();
  const texto = String(fd.get("texto") ?? "").trim().slice(0, 2000);
  const boton = String(fd.get("boton") ?? "") || null;
  const foto = fd.get("foto");
  try {
    if (foto instanceof File && foto.size > 0) {
      if (!TIPOS_IMAGEN.includes(foto.type)) return { error: "Solo se pueden enviar fotos (JPG, PNG o HEIC)." };
      if (foto.size > 8 * 1024 * 1024) return { error: "La foto pesa demasiado (máximo 8 MB)." };
      await procesarEntrada({ patientId, canal: "web", tipo: "image", texto: texto || null, imagen: { data: Buffer.from(await foto.arrayBuffer()), mime: foto.type } });
    } else if (boton) {
      await procesarEntrada({ patientId, canal: "web", tipo: "button", botonId: boton, texto: String(fd.get("botonTitulo") ?? "") || null });
    } else if (texto) {
      await procesarEntrada({ patientId, canal: "web", tipo: "text", texto });
    } else return {};
  } catch (e) {
    console.error("enviarAlAsistente", e);
    return { error: "No se ha podido enviar. Inténtalo de nuevo." };
  }
  revalidatePath("/paciente/asistente");
  return {};
}

export interface VincularState {
  codigo?: string;
  enlace?: string | null;
  error?: string;
}

export async function activarWhatsApp(): Promise<VincularState> {
  const patientId = await paciente();
  if (!criptoConfigurado()) return { error: "WhatsApp todavía no está disponible. Mientras tanto, puedes usar este chat." };
  const codigo = await generarCodigo(patientId);
  return { codigo, enlace: enlaceWhatsApp(codigo) };
}

export async function guardarRecordatorios(_prev: { ok?: boolean }, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const patientId = await paciente();
  const hora = Number(fd.get("hora"));
  const activos = fd.get("activos") === "on";
  if (!Number.isInteger(hora) || hora < 6 || hora > 22) return { error: "Hora no válida." };
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("patient_channels").select("patient_id").eq("patient_id", patientId).maybeSingle();
  const { error } = data
    ? await supabase.from("patient_channels").update({ reminder_hour: hora, reminders_enabled: activos }).eq("patient_id", patientId)
    : await createSupabaseAdmin().from("patient_channels").insert({ patient_id: patientId, reminder_hour: hora, reminders_enabled: activos });
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath("/paciente/asistente");
  return { ok: true };
}
