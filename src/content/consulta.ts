import { z } from "zod";
import { FASE_KEYS, SUPLEMENTO_KEYS } from "./essential";

/** Validación de la nota de consulta, las mediciones y el plan que registra el médico. */
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null));

const limpia = (v: unknown) => (v === "" || v == null ? undefined : typeof v === "string" ? v.replace(",", ".") : v);
const num = (min: number, max: number, campo: string, int = false) =>
  z.preprocess(
    limpia,
    (int ? z.coerce.number().int(`${campo}: sin decimales`) : z.coerce.number({ error: `Revisa ${campo}` }))
      .min(min, `Revisa ${campo}: parece demasiado bajo`)
      .max(max, `Revisa ${campo}: parece demasiado alto`)
      .optional(),
  );

export const encuentroSchema = z
  .object({
    kind: z.enum(["valoracion", "seguimiento", "otra"], { error: "Indica el tipo de consulta" }),
    modality: z.enum(["presencial", "video", "telefono"], { error: "Indica la modalidad" }),
    occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Indica fecha y hora"),
    motivo: texto(2000),
    subjetivo: texto(8000),
    objetivo: texto(8000),
    valoracion: texto(8000),
    plan: texto(8000),
    corrects: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.valoracion || v.plan, { path: ["valoracion"], message: "Escribe al menos la valoración o el plan" });

export const medicionSchema = z
  .object({
    peso_kg: num(30, 350, "el peso"),
    grasa_pct: num(3, 75, "la grasa"),
    masa_magra_kg: num(10, 150, "la masa magra"),
    cintura_cm: num(40, 250, "la cintura"),
    prension_kg: num(0, 120, "la prensión"),
    ta_sistolica: num(60, 260, "la sistólica", true),
    ta_diastolica: num(30, 160, "la diastólica", true),
    fc_lpm: num(30, 220, "la frecuencia", true),
  })
  .refine((v) => v.ta_sistolica == null || v.ta_diastolica == null || v.ta_sistolica > v.ta_diastolica, {
    path: ["ta_diastolica"],
    message: "La diastólica debe ser menor que la sistólica",
  });

export const planSchema = z
  .object({
    route: z.enum(["farmaco", "sin_farmaco"], { error: "Elige la ruta" }),
    proteina_g_dia: num(40, 300, "la proteína", true),
    fuerza_sesiones_semana: num(0, 7, "las sesiones", true),
    pasos_dia: num(0, 40000, "los pasos", true),
    fase_dieta: z.enum(FASE_KEYS).optional().or(z.literal("").transform(() => undefined)),
    productos_dia: num(0, 8, "los productos al día", true),
    periodo_dias: num(1, 365, "el periodo", true),
    mixto_opcion: z.enum(["A", "B", "C"]).optional().or(z.literal("").transform(() => undefined)),
    suplementos: z.array(z.enum(SUPLEMENTO_KEYS)).max(25).default([]),
    medicacion: texto(1000),
    indicaciones: texto(4000),
    proxima_revision: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
  })
  .transform((v) => ({
    ...v,
    // Cada ruta guarda solo sus campos.
    medicacion: v.route === "farmaco" ? v.medicacion : null,
    fase_dieta: v.route === "sin_farmaco" ? v.fase_dieta : undefined,
    productos_dia: v.route === "sin_farmaco" ? v.productos_dia : undefined,
    periodo_dias: v.route === "sin_farmaco" ? v.periodo_dias : undefined,
    mixto_opcion: v.route === "sin_farmaco" && v.fase_dieta === "mixto" ? v.mixto_opcion : undefined,
  }))
  .refine((v) => v.route !== "farmaco" || v.medicacion, { path: ["medicacion"], message: "Indica medicamento, dosis y pauta" })
  .refine((v) => v.route !== "sin_farmaco" || v.fase_dieta, { path: ["fase_dieta"], message: "Indica la fase de la dieta" })
  .refine((v) => v.fase_dieta !== "mixto" || v.mixto_opcion, { path: ["mixto_opcion"], message: "Elige la opción del método mixto" });

export const cambioFaseSchema = z
  .object({
    patient_id: z.uuid(),
    fase_dieta: z.enum(FASE_KEYS, { error: "Elige la fase" }),
    productos_dia: num(0, 8, "los productos al día", true),
    periodo_dias: num(1, 365, "el periodo", true),
    mixto_opcion: z.enum(["A", "B", "C"]).optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.fase_dieta !== "mixto" || v.mixto_opcion, { path: ["mixto_opcion"], message: "Elige la opción del método mixto" });

/** Convierte la hora local de Madrid de un <input type="datetime-local"> a ISO UTC. */
export function madridAIso(local: string): string {
  const [d, t] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const asMadrid = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asMadrid - guess)).toISOString();
}

/** Ahora, en hora de Madrid, con el formato de datetime-local. */
export function ahoraMadridLocal(d = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function erroresDe(e: z.ZodError, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = prefix + String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
