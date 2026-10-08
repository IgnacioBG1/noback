import { Card, CardTitle, fmtFecha, fmtNum } from "./ui";
import { masaGrasa, type Measurement } from "@/lib/historia";

/** Gráfica sencilla en SVG: masa grasa y masa magra a lo largo del tiempo. */
export function Evolucion({ medidas }: { medidas: Measurement[] }) {
  const pts = medidas.map((m) => ({ t: new Date(m.measured_at).getTime(), grasa: masaGrasa(m), magra: m.masa_magra_kg }));
  const series = [
    { key: "grasa" as const, label: "Masa grasa", color: "var(--warn)" },
    { key: "magra" as const, label: "Masa magra", color: "var(--brand)" },
  ];
  const vals = pts.flatMap((p) => [p.grasa, p.magra]).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const W = 600, H = 200, P = { l: 40, r: 12, t: 12, b: 24 };
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const lo = Math.floor(Math.min(...vals) - 2), hi = Math.ceil(Math.max(...vals) + 2);
  const x = (t: number) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b);
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <Card>
      <CardTitle aside="kg">Evolución</CardTitle>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución de la masa grasa y la masa magra">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)" className="num">{v}</text>
          </g>
        ))}
        {series.map((s) => {
          const ps = pts.filter((p) => p[s.key] != null);
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" points={ps.map((p) => `${x(p.t)},${y(p[s.key]!)}`).join(" ")} />
              {ps.map((p) => (
                <circle key={p.t} cx={x(p.t)} cy={y(p[s.key]!)} r="4" fill="var(--surface)" stroke={s.color} strokeWidth="2">
                  <title>{`${s.label}: ${fmtNum(p[s.key]!)} kg`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={P.l} y={H - 4} fontSize="11" fill="var(--ink-soft)">{fmtFecha(medidas[0].measured_at, { day: "numeric", month: "short" })}</text>
        <text x={W - P.r} y={H - 4} fontSize="11" fill="var(--ink-soft)" textAnchor="end">{fmtFecha(medidas[medidas.length - 1].measured_at, { day: "numeric", month: "short" })}</text>
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-ink-soft">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
