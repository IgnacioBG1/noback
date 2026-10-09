import { NextResponse, type NextRequest } from "next/server";
import { descargarMedia, firmaValida, marcarLeido, parseWebhook, enviarTexto, whatsappConfigurado } from "@/lib/agente/whatsapp";
import { pacienteDesdeWhatsApp } from "@/lib/agente/vincular";
import { procesarEntrada } from "@/lib/agente/motor";
import { criptoConfigurado } from "@/lib/cripto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Verificación del webhook por Meta. */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && process.env.WHATSAPP_VERIFY_TOKEN && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!whatsappConfigurado() || !criptoConfigurado()) return new NextResponse("No configurado", { status: 503 });
  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("Firma no válida", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("JSON no válido", { status: 400 });
  }
  for (const m of parseWebhook(body as Parameters<typeof parseWebhook>[0])) {
    try {
      await marcarLeido(m.id);
      const { patientId, recienVinculado } = await pacienteDesdeWhatsApp(m.waId, m.texto);
      if (!patientId) {
        // Número no vinculado: no revelamos nada sobre cuentas ni datos.
        await enviarTexto(m.waId, "Hola, soy el asistente de NoBack. Para hablar conmigo, entra en tu área privada y pulsa «Activar WhatsApp».");
        continue;
      }
      if (recienVinculado) continue;
      const imagen = m.tipo === "image" && m.mediaId ? await descargarMedia(m.mediaId) : null;
      await procesarEntrada({ patientId, canal: "whatsapp", tipo: m.tipo, texto: m.texto, botonId: m.botonId, imagen, waMessageId: m.id });
    } catch (e) {
      console.error("webhook whatsapp", e);
    }
  }
  return NextResponse.json({ ok: true });
}
