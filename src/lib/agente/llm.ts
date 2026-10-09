import "server-only";
import { fase as faseDe, faseNombre, SUPLEMENTOS } from "@/content/essential";
import type { ContextoPaciente } from "./contenido";

/**
 * Proveedor de IA (Anthropic). Solo se usa si hay clave y el paciente activó el consentimiento del asistente.
 * Recibe únicamente el nombre de pila y el plan. Si algo falla, el motor vuelve a las respuestas sin IA o escala.
 */
export const iaConfigurada = () => !!process.env.ANTHROPIC_API_KEY;
const MODELO = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const REGLAS = `Eres el asistente automático de NoBack, un programa médico de pérdida de grasa en España. Hablas en español de España, cercano, breve (máximo 4 frases o una lista corta) y sin emojis.
Reglas estrictas:
1. Solo respondes con la información del PLAN DEL PACIENTE que se te da (fase de la dieta, alimentos y bebidas permitidos, productos, suplementos pautados, objetivos). Si la respuesta no está ahí, no la inventes: escalar=true, motivo="peticion".
2. No das consejo médico. No interpretas síntomas, análisis, peso ni mediciones. No valoras urgencias. No hablas de medicamentos, dosis ni cambios de tratamiento. Si el mensaje trata de salud, síntomas, medicación, embarazo, alergias, estado de ánimo o algo que deba ver un médico: escalar=true, motivo="clinico", y respuesta vacía.
3. Nunca nombres medicamentos ni marcas de medicamentos.
4. Si el paciente pide hablar con una persona, cambiar de plan o de fase, o algo administrativo: escalar=true, motivo="peticion".
Devuelve SOLO un objeto JSON: {"respuesta": string, "escalar": boolean, "motivo": "clinico"|"peticion"|null}.`;

function planComoTexto(ctx: ContextoPaciente): string {
  const p = ctx.plan;
  if (!p) return "El paciente aún no tiene plan asignado.";
  const f = faseDe(p.fase_dieta);
  const sup = p.suplementos.map((k) => SUPLEMENTOS.find((s) => s.key === k)).filter(Boolean).map((s) => `${s!.nombre} (${s!.pauta})`);
  return JSON.stringify({
    ruta: p.route === "farmaco" ? "con tratamiento farmacológico (no lo nombres)" : "sin fármaco, dieta proteinada Essential",
    fase: f ? faseNombre(f.key) : null,
    productos_essential_al_dia: p.productos_dia,
    dias_de_fase: p.periodo_dias,
    inicio_fase: p.fase_inicio,
    objetivos: { proteina_g_dia: p.proteina_g_dia, fuerza_sesiones_semana: p.fuerza_sesiones_semana, pasos_dia: p.pasos_dia },
    indicaciones_del_medico: p.indicaciones,
    suplementos_pautados: sup,
    proxima_revision: p.proxima_revision,
    contenido_de_la_fase: f
      ? { comidas: f.comidas ?? f.opciones ?? f.mantenimiento, verduras: f.verduras, aliños: f.aliño, bebidas: f.bebidas, notas: f.notas, permite: { proteinas: !!f.proteinas, frutas: !!f.frutas, lacteos: !!f.lacteos, pan: !!f.pan, legumbres: !!f.legumbres } }
      : null,
  });
}

async function llamar(body: unknown): Promise<string | null> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      console.error("anthropic", r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const j = (await r.json()) as { content?: { type: string; text?: string }[] };
    return j.content?.find((c) => c.type === "text")?.text ?? null;
  } catch (e) {
    console.error("anthropic", e);
    return null;
  }
}

function parseJson<T>(t: string | null): T | null {
  if (!t) return null;
  const m = t.match(/\{[\s\S]*\}/);
  try {
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch {
    return null;
  }
}

export type RespuestaIA = { respuesta: string; escalar: boolean; motivo: "clinico" | "peticion" | null };

export async function responderConIA(texto: string, ctx: ContextoPaciente, historial: { de: "paciente" | "asistente"; texto: string }[]): Promise<RespuestaIA | null> {
  const msgs = [...historial.slice(-8).map((h) => ({ role: h.de === "paciente" ? "user" : "assistant", content: h.texto })), { role: "user", content: texto }];
  // La API exige alternancia empezando por el usuario.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const out = parseJson<RespuestaIA>(
    await llamar({
      model: MODELO(),
      max_tokens: 500,
      system: `${REGLAS}\n\nNombre de pila: ${ctx.nombre ?? "—"}\nPLAN DEL PACIENTE: ${planComoTexto(ctx)}`,
      messages: msgs,
    }),
  );
  if (!out || typeof out.escalar !== "boolean") return null;
  return { respuesta: String(out.respuesta ?? "").slice(0, 1500), escalar: out.escalar, motivo: out.motivo === "clinico" || out.motivo === "peticion" ? out.motivo : null };
}

export type EstimacionComida = { descripcion: string; proteina_aprox_g: number | null; encaja: "si" | "no" | "dudoso"; comentario: string };

/** Estimación orientativa de una foto de comida frente a la fase (no es una valoración clínica). */
export async function estimarComida(imagenBase64: string, mime: string, ctx: ContextoPaciente): Promise<EstimacionComida | null> {
  const out = parseJson<EstimacionComida>(
    await llamar({
      model: MODELO(),
      max_tokens: 400,
      system: `Analizas fotos de comidas para un programa de dieta en España. Español de España, breve. No das consejo médico.
Devuelve SOLO JSON: {"descripcion": string corta de lo que se ve, "proteina_aprox_g": número o null, "encaja": "si"|"no"|"dudoso" (si los alimentos están permitidos en la fase), "comentario": una frase amable y práctica según la fase}.
PLAN: ${planComoTexto(ctx)}`,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: imagenBase64 } }, { type: "text", text: "¿Qué ves y encaja con mi fase?" }] }],
    }),
  );
  if (!out) return null;
  return { descripcion: String(out.descripcion ?? "").slice(0, 300), proteina_aprox_g: typeof out.proteina_aprox_g === "number" ? Math.round(out.proteina_aprox_g) : null, encaja: ["si", "no", "dudoso"].includes(out.encaja) ? out.encaja : "dudoso", comentario: String(out.comentario ?? "").slice(0, 400) };
}
