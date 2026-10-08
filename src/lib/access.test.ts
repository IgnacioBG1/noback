import { describe, expect, it } from "vitest";
import { decideAccess, safeNext, type SessionInfo } from "./access";

const s = (o: Partial<SessionInfo>): SessionInfo => ({ userId: "u1", role: "patient", aal: "aal1", hasVerifiedFactor: false, ...o });

describe("decideAccess", () => {
  it("sin sesión, todo va a /acceso con la ruta de vuelta", () => {
    expect(decideAccess("clinica", s({ userId: null }), "/clinica")).toEqual({ allow: false, redirectTo: "/acceso?next=%2Fclinica" });
  });
  it("un paciente no entra en la clínica", () => {
    expect(decideAccess("clinica", s({ role: "patient", aal: "aal2" }))).toEqual({ allow: false, redirectTo: "/paciente" });
  });
  it("el personal sin doble factor va a la verificación", () => {
    for (const role of ["doctor", "trainer", "admin"] as const) {
      expect(decideAccess("clinica", s({ role, aal: "aal1" }))).toEqual({ allow: false, redirectTo: "/acceso/doble-factor" });
    }
  });
  it("el personal con doble factor entra en la clínica", () => {
    expect(decideAccess("clinica", s({ role: "doctor", aal: "aal2" }))).toEqual({ allow: true });
  });
  it("el personal no usa el área del paciente", () => {
    expect(decideAccess("paciente", s({ role: "trainer", aal: "aal2" }))).toEqual({ allow: false, redirectTo: "/clinica" });
  });
  it("el paciente entra en su área con un solo factor", () => {
    expect(decideAccess("paciente", s({}))).toEqual({ allow: true });
  });
  it("quien ya tiene aal2 no vuelve a la pantalla de doble factor", () => {
    expect(decideAccess("mfa", s({ role: "doctor", aal: "aal2" }))).toEqual({ allow: false, redirectTo: "/clinica" });
  });
});

describe("safeNext", () => {
  it("acepta rutas internas", () => expect(safeNext("/clinica?x=1")).toBe("/clinica?x=1"));
  it("rechaza redirecciones externas", () => {
    expect(safeNext("https://malo.example")).toBe("/");
    expect(safeNext("//malo.example")).toBe("/");
    expect(safeNext("/\\malo.example")).toBe("/");
    expect(safeNext(null, "/paciente")).toBe("/paciente");
  });
});
