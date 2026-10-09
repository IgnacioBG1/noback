"use client";
import { useState } from "react";
import { FASES, SUPLEMENTOS } from "@/content/essential";
import { inputClass } from "./ui";

const GRUPOS: [string, string][] = [
  ["estandar", "Método Essential"],
  ["sindrome_metabolico", "Diabetes tipo 2 y síndrome metabólico"],
  ["otros", "Otros"],
];

/** Selector de fase Essential con productos al día, periodo y opción del método mixto. */
export function FasePicker({
  fase: faseInicial,
  productosDia,
  periodoDias,
  mixto,
  errors = {},
}: {
  fase?: string | null;
  productosDia?: number | null;
  periodoDias?: number | null;
  mixto?: string | null;
  errors?: Record<string, string>;
}) {
  const [fase, setFase] = useState(faseInicial ?? "fase_1");
  return (
    <div className="space-y-4">
      {GRUPOS.map(([g, titulo]) => (
        <fieldset key={g}>
          <legend className="mb-2 text-xs font-medium text-ink-soft">{titulo}</legend>
          <div className="flex flex-wrap gap-2">
            {FASES.filter((f) => f.grupo === g).map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm has-[:checked]:border-ink has-[:checked]:font-medium has-[:checked]:shadow-[inset_0_0_0_1px_var(--ink)]"
                title={f.resumen}
              >
                <input type="radio" name="fase_dieta" value={f.key} checked={fase === f.key} onChange={() => setFase(f.key)} className="sr-only" />
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: f.color }} />
                {f.nombre}
                {f.subtitulo && g === "estandar" && f.key !== "mantenimiento" ? <span className="hidden text-xs font-normal text-ink-soft sm:inline">· {f.subtitulo.replace("Reintroducción de ", "")}</span> : null}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {errors.fase_dieta && <p role="alert" className="text-xs text-danger">{errors.fase_dieta}</p>}
      {fase === "mixto" && (
        <div className="text-sm">
          <p className="mb-1 font-medium">Opción del método mixto</p>
          <div className="flex gap-2">
            {["A", "B", "C"].map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
                <input type="radio" name="mixto_opcion" value={o} defaultChecked={mixto === o} className="sr-only" />
                Opción {o}
              </label>
            ))}
          </div>
          {errors.mixto_opcion && <p role="alert" className="mt-1 text-xs text-danger">{errors.mixto_opcion}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Productos Essential</span>
          <input name="productos_dia" inputMode="numeric" defaultValue={productosDia ?? ""} className={`${inputClass} num`} />
          <span className="mt-1 block text-xs text-ink-soft">{errors.productos_dia ?? "al día"}</span>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Periodo autorizado</span>
          <input name="periodo_dias" inputMode="numeric" defaultValue={periodoDias ?? ""} className={`${inputClass} num`} />
          <span className="mt-1 block text-xs text-ink-soft">{errors.periodo_dias ?? "días en esta fase"}</span>
        </label>
      </div>
    </div>
  );
}

export function SuplementosPicker({ seleccion = [] }: { seleccion?: string[] }) {
  return (
    <details className="text-sm" open={seleccion.length > 0}>
      <summary className="cursor-pointer font-medium">Suplementación Essential Micro {seleccion.length ? `(${seleccion.length})` : ""}</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SUPLEMENTOS.map((s) => (
          <label key={s.key} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="checkbox" name="suplementos" value={s.key} defaultChecked={seleccion.includes(s.key)} className="mt-0.5 accent-[var(--brand)]" />
            <span>
              <span className="block font-medium">
                {s.nombre}
                {s.ruta === "farmaco" && <span className="ml-1 text-xs font-normal text-brand">· apoyo proteico con tratamiento</span>}
              </span>
              <span className="text-xs text-ink-soft">{s.pauta}</span>
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}
