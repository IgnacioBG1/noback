import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { cifrar, hashCodigo, hashTelefono, normalizaTelefono, nuevoCodigo } from "@/lib/cripto";
import { AVISO_IA } from "./seguridad";
import { enviarTexto } from "./whatsapp";

const VALIDEZ_MIN = 30;

/** Crea un código de un solo uso para vincular el WhatsApp del paciente (válido 30 minutos). */
export async function generarCodigo(patientId: string): Promise<string> {
  const db = createSupabaseAdmin();
  const { codigo, hash } = nuevoCodigo();
  const { error } = await db.from("patient_channels").upsert(
    { patient_id: patientId, link_code_hash: hash, link_code_expires: new Date(Date.now() + VALIDEZ_MIN * 60_000).toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "patient_id" },
  );
  if (error) throw new Error(error.message);
  return codigo;
}

export function enlaceWhatsApp(codigo: string): string | null {
  const num = (process.env.WHATSAPP_BUSINESS_NUMBER ?? "").replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hola, quiero activar mi asistente. Mi código es ${codigo}`)}`;
}

/** Busca al paciente por su número. Si no está vinculado y el mensaje trae un código válido, lo vincula. */
export async function pacienteDesdeWhatsApp(waId: string, texto: string | null): Promise<{ patientId: string | null; recienVinculado: boolean }> {
  const db = createSupabaseAdmin();
  const hash = hashTelefono(waId);
  const { data: ch } = await db.from("patient_channels").select("patient_id").eq("phone_hash", hash).maybeSingle();
  if (ch) return { patientId: ch.patient_id, recienVinculado: false };

  const m = /\b([A-HJ-NP-Z2-9]{6})\b/.exec((texto ?? "").toUpperCase());
  if (m) {
    const { data: pend } = await db.from("patient_channels").select("patient_id, link_code_expires").eq("link_code_hash", hashCodigo(m[1])).maybeSingle();
    if (pend && pend.link_code_expires && Date.parse(pend.link_code_expires) > Date.now()) {
      const tel = normalizaTelefono(waId);
      const { error } = await db
        .from("patient_channels")
        .update({ phone_enc: cifrar(tel), phone_hash: hash, phone_last4: tel.slice(-4), whatsapp_opt_in_at: new Date().toISOString(), link_code_hash: null, link_code_expires: null, updated_at: new Date().toISOString() })
        .eq("patient_id", pend.patient_id);
      if (!error) {
        const { data: p } = await db.from("profiles").select("first_name").eq("id", pend.patient_id).maybeSingle();
        await enviarTexto(waId, `¡Listo${p?.first_name ? `, ${p.first_name}` : ""}! Tu WhatsApp ya está vinculado a NoBack.\n\n${AVISO_IA}\n\nCada día te escribiré un recordatorio corto de tu plan. Pregúntame lo que quieras.`);
        await db.from("messages").insert({ patient_id: pend.patient_id, channel: "whatsapp", direction: "out", sender: "system", body: "WhatsApp vinculado. Mensaje de bienvenida enviado.", meta: { vinculado: true } });
        return { patientId: pend.patient_id, recienVinculado: true };
      }
    }
  }
  return { patientId: null, recienVinculado: false };
}
