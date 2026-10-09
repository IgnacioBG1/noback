"use client";
import { useMemo, useState } from "react";
import type { Producto } from "@/content/productos";

const GAMA_COLOR: Record<string, string> = { verde: "#3FA535", amarilla: "#F2B705", roja: "#D7262E" };
const n1 = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(v));
const eur = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v));

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

/** Catálogo de productos Essential filtrable por tipo, alérgenos y gama. */
export function CatalogoProductos({
  productos,
  tipos,
  filtrosAlergenos,
  alergiasIniciales,
  aviso,
}: {
  productos: Producto[];
  tipos: string[];
  filtrosAlergenos: { key: string; label: string; excluye: string[] }[];
  alergiasIniciales: string[];
  aviso?: string;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [sin, setSin] = useState<string[]>(alergiasIniciales);
  const [gama, setGama] = useState<string | null>(null);
  const [orden, setOrden] = useState<"proteina" | "precio" | "nombre">("proteina");
  const [todos, setTodos] = useState(false);
  const [trazas, setTrazas] = useState(true);

  const lista = useMemo(() => {
    const excluye = filtrosAlergenos.filter((f) => sin.includes(f.key)).flatMap((f) => f.excluye);
    const l = productos.filter(
      (p) =>
        (!tipo || p.tipo === tipo) &&
        (!gama || p.gama === gama) &&
        !p.alergenos.some((a) => excluye.includes(a)) &&
        !(trazas && p.trazas.some((a) => excluye.includes(a))),
    );
    return l.sort((a, b) =>
      orden === "proteina" ? (b.proteina ?? 0) - (a.proteina ?? 0) : orden === "precio" ? (a.eurRacion ?? 99) - (b.eurRacion ?? 99) : a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [productos, tipo, sin, gama, orden, filtrosAlergenos, trazas]);
  const visibles = todos ? lista : lista.slice(0, 12);

  return (
    <div className="space-y-4">
      {aviso && <p className="text-sm text-ink-soft">{aviso}</p>}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Toggle on={!tipo} onClick={() => setTipo(null)}>Todo</Toggle>
          {tipos.map((t) => (
            <Toggle key={t} on={tipo === t} onClick={() => setTipo(tipo === t ? null : t)}>
              {t}
            </Toggle>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filtrosAlergenos.map((f) => (
            <Toggle key={f.key} on={sin.includes(f.key)} onClick={() => setSin(sin.includes(f.key) ? sin.filter((x) => x !== f.key) : [...sin, f.key])}>
              {f.label}
            </Toggle>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          {(["verde", "amarilla", "roja"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gama === g}
              onClick={() => setGama(gama === g ? null : g)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${gama === g ? "border-ink font-medium" : "border-line text-ink-soft"}`}
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: GAMA_COLOR[g] }} />
              Gama {g}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-ink-soft">
            Ordenar
            <select value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink">
              <option value="proteina">Más proteína</option>
              <option value="precio">Más económico</option>
              <option value="nombre">Nombre</option>
            </select>
          </label>
        </div>
        {sin.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={trazas} onChange={(e) => setTrazas(e.target.checked)} className="accent-[var(--brand)]" />
            Excluir también los que pueden contener trazas
          </label>
        )}
        {alergiasIniciales.length > 0 && <p className="text-xs text-ink-soft">Hemos aplicado los filtros de las alergias que nos indicaste. Comprueba siempre la etiqueta.</p>}
      </div>

      <p className="text-sm text-ink-soft">
        <span className="num">{lista.length}</span> producto{lista.length === 1 ? "" : "s"}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {visibles.map((p) => (
          <li key={p.ref} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start gap-2">
              <span aria-label={`Gama ${p.gama}`} className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: GAMA_COLOR[p.gama] }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.nombre}</p>
                <p className="text-xs text-ink-soft">
                  {p.tipo}
                  {p.listo ? " · listo para tomar" : ""}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ["Proteína", `${n1(p.proteina)} g`],
                ["Hidratos", `${n1(p.hidratos)} g`],
                ["Kcal", n1(p.kcal)],
                ["Ración", eur(p.eurRacion)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-bg px-1 py-1.5">
                  <dt className="text-[10px] text-ink-soft">{k}</dt>
                  <dd className="num text-[13px]">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-soft">
              <span className="truncate">
                {p.alergenos.length ? `Contiene: ${p.alergenos.join(", ")}` : "Sin alérgenos principales"}
                {p.trazas.length ? ` · trazas: ${p.trazas.join(", ")}` : ""}
              </span>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand hover:underline">
                Ver ficha
              </a>
            </div>
          </li>
        ))}
      </ul>
      {lista.length > 12 && (
        <button type="button" onClick={() => setTodos(!todos)} className="w-full rounded-lg border border-line bg-surface py-2.5 text-sm font-medium hover:bg-bg">
          {todos ? "Ver menos" : `Ver los ${lista.length} productos`}
        </button>
      )}
      <p className="text-xs text-ink-soft">Valores por ración. Precios orientativos de la tienda de Essential Diet. Las fases permitidas proceden del catálogo oficial.</p>
    </div>
  );
}
