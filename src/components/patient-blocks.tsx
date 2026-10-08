import { Card, CardTitle, Icon, StatCard, fmtNum } from "./ui";
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
