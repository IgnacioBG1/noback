import { Card, CardTitle, Icon, Stat, StatCard, fmtFecha, fmtNum } from "./ui";
import { cambioComposicion, type Measurement } from "@/lib/historia";
import { imc } from "@/content/cuestionario";

/** Datos que el propio paciente declaró en el cuestionario: se muestran tal cual, sin valoración. */
export function PuntoDePartida({ answers }: { answers: Record<string, unknown> | undefined }) {
  const peso = Number(answers?.peso_kg), altura = Number(answers?.altura_cm), cintura = Number(answers?.cintura_cm);
  if (!(peso > 0 && altura > 0)) return null;
  return (
    <Card>
      <CardTitle aside="lo que nos indicaste">Tu punto de partida</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Peso" value={fmtNum(peso)} unit="kg" size="sm" />
        <StatCard label="IMC" value={fmtNum(imc(peso, altura))} size="sm" />
        <StatCard label="Cintura" value={cintura > 0 ? fmtNum(cintura, 0) : "—"} unit={cintura > 0 ? "cm" : undefined} size="sm" />
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        El peso solo cuenta una parte. En tu valoración mediremos cuánto es grasa y cuánto es músculo: eso es lo que seguiremos.
      </p>
    </Card>
  );
}

export function LoQueMediremos() {
  const items = [
    { icon: "scale", t: "Composición corporal", d: "Grasa y masa magra por separado, para perder grasa sin perder músculo." },
    { icon: "grip", t: "Fuerza", d: "La fuerza de prensión es un buen indicador de tu salud muscular." },
    { icon: "dna", t: "Edad biológica", d: "Calculada a partir de tu analítica, para ver cómo cambia con el programa." },
  ];
  return (
    <Card>
      <CardTitle aside="tras tu primera medición">Lo que vamos a medir</CardTitle>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <li key={i.t} className="flex gap-3 rounded-xl border border-line bg-bg p-4 sm:flex-col">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-brand">
              <Icon name={i.icon} size={18} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center justify-between gap-2 text-sm font-medium">
                {i.t}
                <span className="text-[10px] font-normal tracking-wide text-ink-soft uppercase">Pendiente</span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">{i.d}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

type Med = Measurement;

function Delta({ v, unit, invert = false, d = 1 }: { v: number | null; unit: string; invert?: boolean; d?: number }) {
  if (v == null || Math.abs(v) < 0.05) return v == null ? null : <span className="text-xs text-ink-soft">sin cambios</span>;
  const bueno = invert ? v > 0 : v < 0;
  return (
    <span className={`text-xs font-medium ${bueno ? "text-brand" : "text-warn-ink"}`}>
      {v < 0 ? "▼" : "▲"} {fmtNum(Math.abs(v), d)} {unit}
    </span>
  );
}

/** Resumen de composición corporal medida. Solo aritmética sobre los datos, sin interpretación clínica. */
export function Composicion({ medidas }: { medidas: Med[] }) {
  if (!medidas.length) return null;
  const first = medidas[0], last = medidas[medidas.length - 1];
  const varias = medidas.length > 1;
  const dif = (k: keyof Med) => (varias && first[k] != null && last[k] != null ? (last[k] as number) - (first[k] as number) : null);
  const c = varias ? cambioComposicion(first, last) : null;
  return (
    <Card>
      <CardTitle aside={varias ? `desde el ${fmtFecha(first.measured_at, { day: "numeric", month: "short" })}` : `medido el ${fmtFecha(last.measured_at, { day: "numeric", month: "short" })}`}>
        Composición corporal
      </CardTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Peso" value={last.peso_kg != null ? fmtNum(last.peso_kg) : "—"} unit={last.peso_kg != null ? "kg" : undefined} hint={<Delta v={dif("peso_kg")} unit="kg" />} size="sm" />
        <Stat label="Grasa corporal" value={last.grasa_pct != null ? fmtNum(last.grasa_pct) : "—"} unit={last.grasa_pct != null ? "%" : undefined} hint={<Delta v={dif("grasa_pct")} unit="puntos" />} size="sm" />
        <Stat label="Masa magra" value={last.masa_magra_kg != null ? fmtNum(last.masa_magra_kg) : "—"} unit={last.masa_magra_kg != null ? "kg" : undefined} hint={<Delta v={dif("masa_magra_kg")} unit="kg" invert />} size="sm" />
        <Stat label="Fuerza de prensión" value={last.prension_kg != null ? fmtNum(last.prension_kg) : "—"} unit={last.prension_kg != null ? "kg" : undefined} hint={<Delta v={dif("prension_kg")} unit="kg" invert />} size="sm" />
      </div>
      {c?.pctGrasa != null && (
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>Grasa perdida · {fmtNum(Math.abs(c.grasa))} kg</span>
            <span>Otra masa · {fmtNum(Math.abs(c.magra))} kg</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="bg-warn" style={{ width: `${c.pctGrasa}%` }} />
            <div className="bg-brand" style={{ width: `${100 - c.pctGrasa}%` }} />
          </div>
          <p className="text-sm">
            El <span className="num">{Math.round(c.pctGrasa)} %</span> de lo que has perdido es grasa.
          </p>
        </div>
      )}
      {!varias && <p className="mt-4 text-xs text-ink-soft">Esta es tu medición de partida. En la próxima revisión verás cómo cambia.</p>}
    </Card>
  );
}
