import { describe, expect, it } from "vitest";
import { encuentroSchema, madridAIso, medicionSchema, planSchema } from "./consulta";

describe("Consulta", () => {
  it("exige valoración o plan", () => {
    expect(encuentroSchema.safeParse({ kind: "valoracion", modality: "video", occurred_at: "2026-10-08T10:00" }).success).toBe(false);
    expect(encuentroSchema.safeParse({ kind: "valoracion", modality: "video", occurred_at: "2026-10-08T10:00", plan: "x" }).success).toBe(true);
  });
  it("mediciones vacías y con coma", () => {
    const r = medicionSchema.parse({ peso_kg: "92,5", grasa_pct: "", ta_sistolica: "130", ta_diastolica: "80" });
    expect(r).toMatchObject({ peso_kg: 92.5, ta_sistolica: 130 });
    expect(r.grasa_pct).toBeUndefined();
    expect(medicionSchema.safeParse({ ta_sistolica: "80", ta_diastolica: "90" }).success).toBe(false);
  });
  it("cada ruta pide y guarda solo lo suyo", () => {
    expect(planSchema.safeParse({ route: "farmaco" }).success).toBe(false);
    const f = planSchema.parse({ route: "farmaco", medicacion: "Pauta", fase_dieta: "fase_1" });
    expect(f.fase_dieta).toBeUndefined();
    const s = planSchema.parse({ route: "sin_farmaco", fase_dieta: "fase_1", medicacion: "x" });
    expect(s.medicacion).toBeNull();
  });
  it("convierte la hora de Madrid a UTC (verano e invierno)", () => {
    expect(madridAIso("2026-07-01T10:00")).toBe("2026-07-01T08:00:00.000Z");
    expect(madridAIso("2026-12-01T10:00")).toBe("2026-12-01T09:00:00.000Z");
  });
});
