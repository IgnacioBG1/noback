export type Encounter = {
  id: string;
  kind: "valoracion" | "seguimiento" | "otra";
  modality: "presencial" | "video" | "telefono";
  occurred_at: string;
  motivo: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  valoracion: string | null;
  plan: string | null;
  corrects: string | null;
  author: string | null;
  created_at: string;
};
export type Measurement = {
  id: string;
  measured_at: string;
  source: string;
  encounter_id: string | null;
  peso_kg: number | null;
  grasa_pct: number | null;
  masa_magra_kg: number | null;
  cintura_cm: number | null;
  prension_kg: number | null;
  ta_sistolica: number | null;
  ta_diastolica: number | null;
  fc_lpm: number | null;
};
export type CarePlan = {
  id: string;
  route: "farmaco" | "sin_farmaco";
  proteina_g_dia: number | null;
  fuerza_sesiones_semana: number | null;
  pasos_dia: number | null;
  fase_dieta: string | null;
  medicacion: string | null;
  indicaciones: string | null;
  proxima_revision: string | null;
  created_at: string;
  encounter_id: string | null;
};
export type Historia = { encounters: Encounter[]; measurements: Measurement[]; plans: CarePlan[] };

export const KIND_LABEL: Record<string, string> = { valoracion: "Valoración", seguimiento: "Seguimiento", otra: "Otra" };
export const MODALITY_LABEL: Record<string, string> = { presencial: "Presencial", video: "Videoconsulta", telefono: "Teléfono" };
export const FASE_DIETA_LABEL: Record<string, string> = {
  fase_1: "Fase 1 · Inicio",
  fase_2: "Fase 2",
  fase_3: "Fase 3",
  reintroduccion: "Reintroducción",
};

/** Numeric de Postgres llega como texto en JSON: lo normalizamos. */
export function normalizaMedicion(m: Record<string, unknown>): Measurement {
  const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
  return {
    ...(m as unknown as Measurement),
    peso_kg: n(m.peso_kg),
    grasa_pct: n(m.grasa_pct),
    masa_magra_kg: n(m.masa_magra_kg),
    cintura_cm: n(m.cintura_cm),
    prension_kg: n(m.prension_kg),
    ta_sistolica: n(m.ta_sistolica),
    ta_diastolica: n(m.ta_diastolica),
    fc_lpm: n(m.fc_lpm),
  };
}

/** Masa grasa en kg cuando hay peso y porcentaje. */
export const masaGrasa = (m: Measurement) => (m.peso_kg != null && m.grasa_pct != null ? (m.peso_kg * m.grasa_pct) / 100 : null);

/**
 * Cambio de composición entre dos mediciones. Solo aritmética sobre los datos medidos:
 * qué parte de la pérdida de peso es grasa y qué parte es masa magra.
 */
export function cambioComposicion(a: Measurement, b: Measurement) {
  const ga = masaGrasa(a), gb = masaGrasa(b);
  if (ga == null || gb == null || a.peso_kg == null || b.peso_kg == null) return null;
  const peso = b.peso_kg - a.peso_kg;
  const grasa = gb - ga;
  const magra = peso - grasa;
  const pctGrasa = peso < 0 ? Math.max(0, Math.min(100, (grasa / peso) * 100)) : null;
  return { peso, grasa, magra, pctGrasa };
}
