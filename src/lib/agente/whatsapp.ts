import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Boton } from "./botones";

/** WhatsApp Cloud API (Meta). Variables: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN. */
const GRAPH = "https://graph.facebook.com/v21.0";
export const whatsappConfigurado = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APP_SECRET);

export function firmaValida(raw: string, cabecera: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !cabecera?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const recibida = Buffer.from(cabecera.slice(7));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

async function enviar(payload: Record<string, unknown>): Promise<string | null> {
  const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
  if (!r.ok) {
    console.error("whatsapp enviar", r.status, j.error?.message);
    return null;
  }
  return j.messages?.[0]?.id ?? null;
}

export const enviarTexto = (to: string, texto: string) => enviar({ to, type: "text", text: { body: texto.slice(0, 4096), preview_url: false } });

export const enviarBotones = (to: string, texto: string, botones: Boton[]) =>
  enviar({
    to,
    type: "interactive",
    interactive: { type: "button", body: { text: texto.slice(0, 1024) }, action: { buttons: botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.titulo.slice(0, 20) } })) } },
  });

/** Fuera de la ventana de 24 h solo se puede escribir con plantillas aprobadas por Meta. */
export const enviarPlantilla = (to: string, nombre: string, parametros: string[]) =>
  enviar({
    to,
    type: "template",
    template: { name: nombre, language: { code: "es" }, components: parametros.length ? [{ type: "body", parameters: parametros.map((t) => ({ type: "text", text: t })) }] : [] },
  });

export async function marcarLeido(id: string) {
  await enviar({ status: "read", message_id: id }).catch(() => null);
}

export async function descargarMedia(mediaId: string): Promise<{ data: Buffer; mime: string } | null> {
  const h = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  const meta = (await (await fetch(`${GRAPH}/${mediaId}`, { headers: h })).json().catch(() => null)) as { url?: string; mime_type?: string } | null;
  if (!meta?.url) return null;
  const r = await fetch(meta.url, { headers: h });
  if (!r.ok) return null;
  return { data: Buffer.from(await r.arrayBuffer()), mime: meta.mime_type ?? "image/jpeg" };
}

/** Mensaje entrante normalizado desde el webhook. */
export type Entrante = {
  waId: string; // número del paciente (E.164 sin +)
  id: string;
  tipo: "text" | "button" | "image" | "otro";
  texto: string | null;
  botonId: string | null;
  mediaId: string | null;
  mime: string | null;
};

type WebhookBody = {
  entry?: { changes?: { value?: { messages?: Array<Record<string, unknown> & { from: string; id: string; type: string }> } }[] }[];
};

export function parseWebhook(body: WebhookBody): Entrante[] {
  const out: Entrante[] = [];
  for (const e of body.entry ?? [])
    for (const ch of e.changes ?? [])
      for (const m of ch.value?.messages ?? []) {
        const base = { waId: m.from, id: m.id, texto: null, botonId: null, mediaId: null, mime: null } as Entrante;
        if (m.type === "text") out.push({ ...base, tipo: "text", texto: (m.text as { body?: string })?.body ?? "" });
        else if (m.type === "interactive") {
          const r = (m.interactive as { button_reply?: { id: string; title: string } })?.button_reply;
          out.push({ ...base, tipo: "button", botonId: r?.id ?? null, texto: r?.title ?? null });
        } else if (m.type === "button") out.push({ ...base, tipo: "button", texto: (m.button as { text?: string; payload?: string })?.text ?? null, botonId: (m.button as { payload?: string })?.payload ?? null });
        else if (m.type === "image") {
          const i = m.image as { id?: string; mime_type?: string; caption?: string };
          out.push({ ...base, tipo: "image", mediaId: i?.id ?? null, mime: i?.mime_type ?? null, texto: i?.caption ?? null });
        } else out.push({ ...base, tipo: "otro" });
      }
  return out;
}
