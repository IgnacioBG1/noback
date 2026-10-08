import { describe, expect, it } from "vitest";
import { cambioComposicion, normalizaMedicion } from "./historia";

const m = (peso: number, grasa: number) => normalizaMedicion({ id: "x", measured_at: "", peso_kg: String(peso), grasa_pct: String(grasa) });

describe("cambioComposicion", () => {
  it("calcula qué parte de la pérdida es grasa", () => {
    const c = cambioComposicion(m(100, 40), m(90, 36))!; // grasa 40 → 32,4 kg; pierde 10 kg, 7,6 de grasa
    expect(c.peso).toBeCloseTo(-10);
    expect(c.grasa).toBeCloseTo(-7.6);
    expect(c.magra).toBeCloseTo(-2.4);
    expect(c.pctGrasa).toBeCloseTo(76);
  });
  it("sin porcentaje de grasa no calcula", () => {
    expect(cambioComposicion(normalizaMedicion({ peso_kg: 90 }), m(80, 30))).toBeNull();
  });
  it("si no hay pérdida de peso no hay porcentaje", () => {
    expect(cambioComposicion(m(80, 30), m(82, 28))!.pctGrasa).toBeNull();
  });
});
