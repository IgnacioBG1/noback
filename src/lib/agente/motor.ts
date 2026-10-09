import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { AVISO_IA, MENSAJE_ESCALADO, MENSAJE_NO_SE, pareceClinico } from "./seguridad";
import { PREGUNTAS, RESPUESTA_CHECKIN, botonDesdeTexto, parseBoton, type Boton, type CheckinKind } from "./botones";
import { respuestaDelPlan, resumenFase, type ContextoPaciente } from "./contenido";
import { estimarComida, iaConfigurada, responderConIA } from "./llm";
import { enviarBotones, enviarPlantilla, enviarTexto, whatsappConfigurado } from "./whatsapp";
import { descifrar } from "@/lib/cripto";

type Admin = ReturnType<typeof createSupabaseAdmin>;
export type Canal = "whatsapp" | "web";

export interface Entrada {
  patientId: string;
  canal: Canal;
  tipo: "text" | "button" | "image" | "otro";
  texto?: string | null;
  botonId?: string | null;
  imagen?: { data: Buffer; mime: string } | null;
  waMessageId?: string | null;
}

type Salida = { texto: string; botones?: Boton[]; meta?: Record<string, unknown> };

const PIDE_PERSONA = /hablar con (alguien|una persona|el medico|la medica|mi medic|el doctor|la doctora|el equipo)|que me llame|llamadme|quiero una cita|cambiar (de )?(fase|plan|dieta)|darme de baja|cancelar/;
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const hoyMadrid = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
const ayerMadrid = () => hoyMadrid(new Date(Date.now() - 86_400_000));

export async function contexto(db: Admin, patientId: string): Promise<ContextoPaciente & { iaPermitida: boolean }> {
  const [{ data: perfil }, { data: planes }, { data: consent }] = await Promise.all([
    db.from("profiles").select("first_name").eq("id", patientId).maybeSingle(),
    db.from("care_plans").select("route, fase_dieta, productos_dia, periodo_dias, fase_inicio, proteina_g_dia, fuerza_sesiones_semana, pasos_dia, indicaciones, suplementos, proxima_revision").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1),
    db.from("consents").select("granted").eq("user_id", patientId).eq("kind", "agente_ia").order("created_at", { ascending: false }).limit(1),
  ]);
  return {
    nombre: perfil?.first_name ?? null,
    plan: (planes?.[0] as ContextoPaciente["plan"]) ?? null,
    iaPermitida: iaConfigurada() && !!consent?.[0]?.granted,
  };
}

async function guardarImagen(db: Admin, patientId: string, img: { data: Buffer; mime: string }): Promise<string | null> {
  const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
  const path = `${patientId}/${randomUUID()}.${ext}`;
  const { error } = await db.storage.from("comidas").upload(path, img.data, { contentType: img.mime, upsert: false });
  if (error) {
    console.error("guardarImagen", error.message);
    return null;
  }
  return path;
}

/** Número de WhatsApp del paciente (descifrado solo para enviar). */
async function telefono(db: Admin, patientId: string): Promise<string | null> {
  const { data } = await db.from("patient_channels").select("phone_enc").eq("patient_id", patientId).maybeSingle();
  if (!data?.phone_enc) return null;
  try {
    return descifrar(data.phone_enc);
  } catch {
    return null;
  }
}

/** Guarda y envía mensajes salientes por el canal del paciente. */
export async function enviarSalidas(db: Admin, patientId: string, canal: Canal, salidas: Salida[], sender: "agent" | "staff" | "system" = "agent", staffId?: string) {
  const to = canal === "whatsapp" && whatsappConfigurado() ? await telefono(db, patientId) : null;
  for (const s of salidas) {
    let waId: string | null = null;
    if (to) waId = s.botones?.length ? await enviarBotones(to, s.texto, s.botones) : await enviarTexto(to, s.texto);
    await db.from("messages").insert({
      patient_id: patientId,
      channel: canal,
      direction: "out",
      sender,
      staff_id: staffId ?? null,
      kind: "text",
      body: s.texto,
      meta: { ...(s.meta ?? {}), ...(s.botones ? { botones: s.botones } : {}) },
      wa_message_id: waId,
    });
  }
}

async function escalar(db: Admin, patientId: string, messageId: string, reason: "clinico" | "peticion" | "no_entiende" | "malestar") {
  await db.from("escalations").insert({ patient_id: patientId, message_id: messageId, reason });
}

async function registrarCheckin(db: Admin, patientId: string, kind: CheckinKind, value: string, messageId: string) {
  const day = kind === "animo" ? hoyMadrid() : ayerMadrid();
  await db.from("checkins").upsert({ patient_id: patientId, kind, value, day, message_id: messageId }, { onConflict: "patient_id,kind,day" });
}

/** Procesa un mensaje del paciente y responde. Idempotente con el id de WhatsApp. */
export async function procesarEntrada(e: Entrada): Promise<{ escalado: boolean; salidas: Salida[] }> {
  const db = createSupabaseAdmin();
  const mediaPath = e.imagen ? await guardarImagen(db, e.patientId, e.imagen) : null;
  const { data: inMsg, error } = await db
    .from("messages")
    .insert({
      patient_id: e.patientId,
      channel: e.canal,
      direction: "in",
      sender: "patient",
      kind: e.tipo === "image" ? "image" : e.tipo === "button" ? "button" : "text",
      body: e.texto ?? null,
      media_path: mediaPath,
      meta: e.botonId ? { boton: e.botonId } : {},
      wa_message_id: e.waMessageId ?? null,
    })
    .select("id")
    .single();
  if (error || !inMsg) {
    if (error?.code === "23505") return { escalado: false, salidas: [] }; // ya procesado
    throw new Error(`No se pudo guardar el mensaje: ${error?.message}`);
  }

  const ctx = await contexto(db, e.patientId);
  const { count: previas } = await db.from("messages").select("id", { count: "exact", head: true }).eq("patient_id", e.patientId).eq("sender", "agent");
  const salidas: Salida[] = [];
  if (!previas) salidas.push({ texto: AVISO_IA });
  let escalado = false;
  const esc = async (r: "clinico" | "peticion" | "no_entiende" | "malestar") => {
    escalado = true;
    await escalar(db, e.patientId, inMsg.id, r);
  };

  const botonId = e.botonId ?? (e.tipo === "button" ? botonDesdeTexto(e.texto) : null);
  const boton = parseBoton(botonId);

  if (boton) {
    await registrarCheckin(db, e.patientId, boton.kind, boton.value, inMsg.id);
    salidas.push({ texto: RESPUESTA_CHECKIN[`${boton.kind}:${boton.value}`] ?? "¡Anotado!" });
    if (boton.kind === "animo" && boton.value === "mal") await esc("malestar");
  } else if (e.tipo === "image") {
    if (e.texto && pareceClinico(e.texto)) {
      await esc("clinico");
      salidas.push({ texto: MENSAJE_ESCALADO });
    }
    const est = ctx.iaPermitida && e.imagen ? await estimarComida(e.imagen.data.toString("base64"), e.imagen.mime, ctx) : null;
    salidas.push(
      est
        ? {
            texto: `${est.descripcion}${est.proteina_aprox_g != null ? ` (unos ${est.proteina_aprox_g} g de proteína, aproximado).` : "."} ${est.comentario} Tu equipo también la verá.`,
            meta: { estimacion: est },
          }
        : { texto: "¡Foto recibida! Queda guardada y tu equipo la verá." },
    );
  } else if (e.tipo === "text" && e.texto?.trim()) {
    const t = e.texto.trim();
    if (pareceClinico(t)) {
      await esc("clinico");
      salidas.push({ texto: MENSAJE_ESCALADO });
    } else if (PIDE_PERSONA.test(norm(t))) {
      await esc("peticion");
      salidas.push({ texto: "Claro. Se lo paso a tu equipo y te contestan por aquí lo antes posible." });
    } else {
      let hecho = false;
      if (ctx.iaPermitida) {
        const { data: hist } = await db.from("messages").select("sender, body").eq("patient_id", e.patientId).in("sender", ["patient", "agent"]).neq("id", inMsg.id).order("created_at", { ascending: false }).limit(8);
        const ia = await responderConIA(t, ctx, (hist ?? []).reverse().filter((h) => h.body).map((h) => ({ de: h.sender === "patient" ? "paciente" : "asistente", texto: h.body! })));
        if (ia) {
          hecho = true;
          if (ia.escalar) {
            await esc(ia.motivo === "clinico" ? "clinico" : "peticion");
            salidas.push({ texto: ia.motivo === "clinico" ? MENSAJE_ESCALADO : ia.respuesta || MENSAJE_NO_SE });
          } else salidas.push({ texto: ia.respuesta, meta: { ia: true } });
        }
      }
      if (!hecho) {
        const r = respuestaDelPlan(t, ctx);
        if (r) salidas.push({ texto: r });
        else {
          await esc("no_entiende");
          salidas.push({ texto: MENSAJE_NO_SE });
        }
      }
    }
  } else {
    salidas.push({ texto: "Por ahora entiendo mensajes de texto, fotos de tus comidas y los botones de respuesta." });
  }

  await enviarSalidas(db, e.patientId, e.canal, salidas);
  return { escalado, salidas };
}

/** Recordatorio diario + preguntas de un toque. Devuelve false si ya se envió hoy. */
export async function enviarRecordatorio(patientId: string, canal: Canal, ahora = new Date()): Promise<boolean> {
  const db = createSupabaseAdmin();
  const hoy = hoyMadrid(ahora);
  const { data: ya } = await db.from("messages").select("id").eq("patient_id", patientId).eq("sender", "system").contains("meta", { recordatorio: hoy }).limit(1);
  if (ya?.length) return false;
  const ctx = await contexto(db, patientId);
  if (!ctx.plan) return false;
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(ahora);
  const saludo = `Buenos días${ctx.nombre ? `, ${ctx.nombre}` : ""}.`;
  const resumen = resumenFase(ctx, ahora)?.split("\n").slice(0, 2).join(" ");
  const salidas: Salida[] = [
    { texto: `${saludo} ${resumen ?? "Hoy sigues con tu plan."} Si tienes cualquier duda, escríbeme por aquí.`, meta: { recordatorio: hoy } },
    { texto: PREGUNTAS.plan.texto, botones: PREGUNTAS.plan.botones, meta: { recordatorio: hoy, pregunta: "plan" } },
  ];
  if (["Tue", "Thu", "Sat"].includes(dow) && (ctx.plan.fuerza_sesiones_semana ?? 0) > 0)
    salidas.push({ texto: "¿Hiciste ayer tu entreno de fuerza?", botones: PREGUNTAS.entreno.botones, meta: { recordatorio: hoy, pregunta: "entreno" } });
  if (dow === "Mon") salidas.push({ texto: PREGUNTAS.animo.texto, botones: PREGUNTAS.animo.botones, meta: { recordatorio: hoy, pregunta: "animo" } });

  // WhatsApp: fuera de la ventana de 24 h solo valen plantillas aprobadas.
  if (canal === "whatsapp" && whatsappConfigurado()) {
    const { data: ultimo } = await db.from("messages").select("created_at").eq("patient_id", patientId).eq("direction", "in").eq("channel", "whatsapp").order("created_at", { ascending: false }).limit(1);
    const abierta = ultimo?.[0] && Date.now() - Date.parse(ultimo[0].created_at) < 23 * 3600_000;
    if (!abierta) {
      const to = await telefono(db, patientId);
      const waId = to ? await enviarPlantilla(to, "noback_recordatorio", [ctx.nombre ?? "", resumen ?? "Hoy sigues con tu plan."]) : null;
      await db.from("messages").insert({ patient_id: patientId, channel: "whatsapp", direction: "out", sender: "system", kind: "template", body: `${saludo} ${resumen ?? ""} ${PREGUNTAS.plan.texto}`.trim(), meta: { recordatorio: hoy, plantilla: "noback_recordatorio", botones: PREGUNTAS.plan.botones }, wa_message_id: waId });
      return true;
    }
  }
  await enviarSalidas(db, patientId, canal, salidas, "system");
  return true;
}
