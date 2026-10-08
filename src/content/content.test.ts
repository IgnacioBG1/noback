import { describe, expect, it } from "vitest";
import lock from "./consentimientos.lock.json";
import { CONSENT_DOCS, REQUIRED_CONSENTS } from "./consentimientos";
import { consentHash } from "./hash";
import { datosPersonalesSchema, edad, imc, intakeSchema } from "./cuestionario";

describe("Consentimientos", () => {
  it("cualquier cambio de texto exige una versión nueva (hash fijado en el .lock)", () => {
    for (const d of CONSENT_DOCS) {
      const key = `${d.kind}@${d.version}` as keyof typeof lock;
      expect(lock[key], `Falta ${key} en consentimientos.lock.json: sube la versión y regenera el lock`).toBe(consentHash(d));
    }
  });
  it("privacidad y telemedicina son obligatorios; IA y comunicación, opcionales", () => {
    expect(REQUIRED_CONSENTS.sort()).toEqual(["privacidad", "telemedicina_whatsapp"]);
  });
  it("los textos públicos no nombran medicamentos", () => {
    const all = JSON.stringify(CONSENT_DOCS).toLowerCase();
    for (const w of ["semaglutida", "tirzepatida", "wegovy", "mounjaro", "ozempic", "glp-1", "glp1"]) expect(all).not.toContain(w);
  });
});

describe("Cuestionario", () => {
  const base = {
    peso_kg: "92.5",
    altura_cm: "170",
    cintura_cm: "",
    objetivo: "Perder grasa sin perder fuerza",
    antecedentes: ["hipertension"],
    usa_glp1: "no",
    preferencia_ruta: "indiferente",
    actividad: "ligera",
    fuerza_dias: "1",
  };
  it("acepta un cuestionario completo y convierte números", () => {
    const r = intakeSchema.parse(base);
    expect(r.peso_kg).toBe(92.5);
    expect(r.cintura_cm).toBeUndefined();
    expect(r.embarazo).toBe("no");
  });
  it("si usa o usó el tratamiento, pide el detalle", () => {
    const r = intakeSchema.safeParse({ ...base, usa_glp1: "si" });
    expect(r.success).toBe(false);
  });
  it("rechaza valores imposibles", () => {
    expect(intakeSchema.safeParse({ ...base, peso_kg: "9" }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...base, antecedentes: ["inventado"] }).success).toBe(false);
  });
  it("solo mayores de 18 años", () => {
    const hoy = new Date();
    const menor = `${hoy.getUTCFullYear() - 17}-01-01`;
    expect(datosPersonalesSchema.safeParse({ birth_date: menor, sex: "mujer" }).success).toBe(false);
    expect(datosPersonalesSchema.safeParse({ birth_date: "1980-05-20", sex: "mujer" }).success).toBe(true);
  });
  it("edad e IMC", () => {
    expect(edad("1980-10-09", new Date("2026-10-08T00:00:00Z"))).toBe(45);
    expect(edad("1980-10-08", new Date("2026-10-08T00:00:00Z"))).toBe(46);
    expect(imc(92.5, 170)).toBe(32);
  });
});
