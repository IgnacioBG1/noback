import { describe, expect, it } from "vitest";
import { pareceClinico } from "./seguridad";
import { botonDesdeTexto, parseBoton } from "./botones";
import { respuestaDelPlan, resumenFase, type ContextoPaciente } from "./contenido";

const ctx: ContextoPaciente = {
  nombre: "Ana",
  plan: { route: "sin_farmaco", fase_dieta: "fase_1", productos_dia: 5, periodo_dias: 21, fase_inicio: "2026-10-01", proteina_g_dia: null, fuerza_sesiones_semana: 2, pasos_dia: 8000, indicaciones: null, suplementos: ["oligovit"], proxima_revision: "2026-10-29" },
};

describe("Seguridad del asistente", () => {
  it("todo lo que suena a salud se escala", () => {
    for (const t of ["Me duele la cabeza", "tengo náuseas", "¿Puedo tomar ibuprofeno?", "creo que estoy embarazada", "me mareo al levantarme", "tengo el azúcar bajo", "me noto el corazón acelerado"]) {
      expect(pareceClinico(t), t).toBe(true);
    }
  });
  it("lo del plan no", () => {
    for (const t of ["¿Qué verduras puedo comer?", "¿Puedo tomar café?", "¿cuántos productos me tocan hoy?", "Hola"]) expect(pareceClinico(t), t).toBe(false);
  });
});

describe("Botones", () => {
  it("lee ids y textos de plantilla", () => {
    expect(parseBoton("ci:plan:parcial")).toEqual({ kind: "plan", value: "parcial" });
    expect(parseBoton("x")).toBeNull();
    expect(botonDesdeTexto("A medias")).toBe("ci:plan:parcial");
  });
});

describe("Respuestas del plan sin IA", () => {
  it("responde con el contenido de la fase", () => {
    expect(respuestaDelPlan("¿qué verduras puedo comer?", ctx)).toMatch(/Acelgas/);
    expect(respuestaDelPlan("¿puedo tomar café?", ctx)).toMatch(/no torrefacto/);
    expect(respuestaDelPlan("¿puedo comer fruta?", ctx)).toMatch(/todavía no toca fruta/);
    expect(respuestaDelPlan("mis suplementos", ctx)).toMatch(/Oligovit/);
    expect(respuestaDelPlan("asdfgh", ctx)).toBeNull();
  });
  it("resume el día de la fase", () => {
    expect(resumenFase(ctx, new Date("2026-10-05T10:00:00Z"))).toMatch(/día 5 de 21[\s\S]*5 productos/);
  });
});
