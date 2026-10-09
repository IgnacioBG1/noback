import { describe, expect, it } from "vitest";
import lock from "./consentimientos.lock.json";
import { CONSENT_DOCS, REQUIRED_CONSENTS, TREATMENT_DOCS } from "./consentimientos";
import { consentHash } from "./hash";
import { datosPersonalesSchema, edad, imc, intakeSchema } from "./cuestionario";

describe("Consentimientos", () => {
  it("cualquier cambio de texto exige una versión nueva (hash fijado en el .lock)", () => {
    for (const d of [...CONSENT_DOCS, ...TREATMENT_DOCS]) {
      const key = `${d.kind}@${d.version}` as keyof typeof lock;
      expect(lock[key], `Falta ${key} en consentimientos.lock.json: sube la versión y regenera el lock`).toBe(consentHash(d));
    }
  });
  it("privacidad y telemedicina son obligatorios; IA y comunicación, opcionales", () => {
    expect(REQUIRED_CONSENTS.sort()).toEqual(["privacidad", "telemedicina_whatsapp"]);
  });
  it("los textos públicos no nombran medicamentos", () => {
    const all = JSON.stringify([...CONSENT_DOCS, ...TREATMENT_DOCS].map(({ title, checkbox, body }) => ({ title, checkbox, body }))).toLowerCase();
    for (const w of ["semaglutida", "tirzepatida", "wegovy", "mounjaro", "ozempic", "saxenda", "liraglutida", "glp-1", "glp1"]) expect(all).not.toContain(w);
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

import { FASES, SUPLEMENTOS } from "./essential";
describe("Fases Essential", () => {
  it("13 fases con contenido completo y claves únicas", () => {
    expect(FASES).toHaveLength(13);
    expect(new Set(FASES.map((f) => f.key)).size).toBe(13);
    for (const f of FASES) {
      expect(f.comidas?.length || f.opciones?.length || f.mantenimiento?.length, f.key).toBeTruthy();
      expect(f.bebidas.length, f.key).toBeGreaterThan(0);
      expect(f.aliño.length, f.key).toBeGreaterThan(0);
    }
    expect(new Set(SUPLEMENTOS.map((s) => s.key)).size).toBe(SUPLEMENTOS.length);
  });
  it("síndrome metabólico sin lista 2; fases 1 y 2 con límite de la lista 2", () => {
    expect(FASES.find((f) => f.key === "sm_1")!.verduras.listas).toHaveLength(1);
    expect(FASES.find((f) => f.key === "fase_2_1")!.verduras.listas[1].nota).toMatch(/150 g/);
    expect(FASES.find((f) => f.key === "sm_2_1")!.verduras.listas[0].items).toContain("Pepinillo natural");
  });
});

import { PRODUCTOS, alergenosDeTexto, productosParaFase } from "./productos";
import { faseCatalogo } from "./essential";
describe("Catálogo de productos Essential", () => {
  it("142 productos de dieta con nutrición, y las galletas de gama roja solo desde la fase 3", () => {
    expect(PRODUCTOS).toHaveLength(142);
    expect(PRODUCTOS.every((p) => p.proteina != null && p.fases.length > 0)).toBe(true);
    expect(productosParaFase("1").some((p) => p.ref === "DB45")).toBe(false);
    expect(productosParaFase("3").some((p) => p.ref === "DB45")).toBe(true);
  });
  it("mapea fases del protocolo y alergias escritas a mano", () => {
    expect(faseCatalogo("sm_2_1")).toBe("2");
    expect(faseCatalogo("fase_3_4")).toBe("3");
    expect(faseCatalogo("mantenimiento")).toBe("M");
    expect(alergenosDeTexto("Intolerancia a la LACTOSA y celíaca")).toEqual(["gluten", "lactosa"]);
    expect(alergenosDeTexto("—")).toEqual([]);
  });
});
