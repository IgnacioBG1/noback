import { z } from "zod";

/** Cuestionario de acogida. Lo interpreta siempre el médico: ninguna respuesta excluye automáticamente. */
export const INTAKE_VERSION = "2026-10-08";

export const ANTECEDENTES = [
  ["diabetes_tipo_2", "Diabetes tipo 2"],
  ["diabetes_tipo_1", "Diabetes tipo 1"],
  ["hipertension", "Tensión arterial alta"],
  ["colesterol", "Colesterol o triglicéridos altos"],
  ["higado_graso", "Hígado graso"],
  ["apnea_sueno", "Apnea del sueño"],
  ["cardiovascular", "Infarto, ictus u otra enfermedad cardiovascular"],
  ["renal", "Enfermedad renal"],
  ["pancreatitis", "Pancreatitis (alguna vez)"],
  ["biliar", "Piedras en la vesícula o enfermedad biliar"],
  ["tiroides_medular", "Cáncer medular de tiroides o síndrome MEN2 (tú o tu familia)"],
  ["retinopatia", "Retinopatía diabética"],
  ["tca", "Trastorno de la conducta alimentaria (actual o pasado)"],
  ["depresion_ansiedad", "Depresión o ansiedad en tratamiento"],
] as const;

export type AntecedenteKey = (typeof ANTECEDENTES)[number][0];
const antecedenteKeys = ANTECEDENTES.map(([k]) => k) as [AntecedenteKey, ...AntecedenteKey[]];

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));

const limpiaNumero = (v: unknown) => (v === "" || v == null ? undefined : typeof v === "string" ? v.replace(",", ".") : v);
const numeroBase = (min: number, max: number, campo: string) =>
  z.coerce
    .number({ error: `Indica ${campo}` })
    .min(min, `Revisa ${campo}: parece demasiado bajo`)
    .max(max, `Revisa ${campo}: parece demasiado alto`);
const numero = (min: number, max: number, campo: string) => z.preprocess(limpiaNumero, numeroBase(min, max, campo));
const numeroOpcional = (min: number, max: number, campo: string) =>
  z.preprocess(limpiaNumero, numeroBase(min, max, campo).optional());

export const datosPersonalesSchema = z.object({
  birth_date: z.iso.date({ error: "Indica tu fecha de nacimiento" }).refine((d) => edad(d) >= 18, "El programa es solo para mayores de 18 años"),
  sex: z.enum(["mujer", "hombre"], { error: "Indica tu sexo biológico" }),
});

export const intakeSchema = z
  .object({
    peso_kg: numero(30, 350, "el peso"),
    altura_cm: numero(120, 230, "la altura"),
    cintura_cm: numeroOpcional(40, 250, "la cintura"),
    objetivo: z.string().trim().min(3, "Cuéntanos brevemente tu objetivo").max(600),
    antecedentes: z.array(z.enum(antecedenteKeys)).default([]),
    otros_antecedentes: texto(600),
    embarazo: z.enum(["no", "embarazo", "lactancia", "planificando"]).default("no"),
    medicacion_actual: texto(800),
    alergias: texto(400),
    usa_glp1: z.enum(["no", "si", "antes"], { error: "Indica si usas o has usado este tipo de tratamiento" }),
    glp1_detalle: texto(400),
    preferencia_ruta: z.enum(["con_farmaco", "sin_farmaco", "indiferente"], { error: "Indica tu preferencia" }),
    actividad: z.enum(["sedentaria", "ligera", "moderada", "alta"], { error: "Indica tu nivel de actividad" }),
    fuerza_dias: z.coerce.number().int().min(0).max(7),
    comentarios: texto(800),
  })
  .superRefine((v, ctx) => {
    if (v.usa_glp1 !== "no" && !v.glp1_detalle) {
      ctx.addIssue({ code: "custom", path: ["glp1_detalle"], message: "Indica cuál, la dosis y desde cuándo" });
    }
  });

export type IntakeAnswers = z.infer<typeof intakeSchema>;

export function edad(isoDate: string, hoy = new Date()): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  let e = hoy.getUTCFullYear() - d.getUTCFullYear();
  const m = hoy.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && hoy.getUTCDate() < d.getUTCDate())) e--;
  return e;
}

/** IMC orientativo para mostrar al médico. No se usa para decidir nada automáticamente. */
export const imc = (peso: number, alturaCm: number) => Math.round((peso / (alturaCm / 100) ** 2) * 10) / 10;
