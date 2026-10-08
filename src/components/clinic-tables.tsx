import Link from "next/link";
import { Badge, fmtFecha, iniciales, nombreCompleto } from "./ui";
import { diasDesde, PHASE_LABEL, ROUTE_LABEL, type PacienteFila, type Pendiente } from "@/lib/clinica";
import { edad } from "@/content/cuestionario";

export function Avatar({ p, tone = "default" }: { p: { first_name: string | null; last_name: string | null }; tone?: "default" | "warn" }) {
  return (
    <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${tone === "warn" ? "bg-warn-line text-warn-ink" : "bg-brand-soft text-brand"}`}>
      {iniciales(p)}
    </span>
  );
}

export function EstadoBadge({ phase }: { phase: string | null }) {
  if (!phase) return <Badge>Registro</Badge>;
  const tone = phase === "valoracion" ? "warn" : phase === "activa" ? "brand" : phase === "mantenimiento" ? "ok" : "default";
  return <Badge tone={tone}>{PHASE_LABEL[phase] ?? phase}</Badge>;
}

export function PendientesLista({ items, limit }: { items: Pendiente[]; limit?: number }) {
  return (
    <ul className="divide-y divide-line">
      {items.slice(0, limit).map((p) => {
        const dias = diasDesde(p.paid_at) ?? 0;
        return (
          <li key={p.patient_id}>
            <Link href={`/clinica/pacientes/${p.patient_id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-bg">
              <Avatar p={p} tone={dias >= 3 ? "warn" : "default"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nombreCompleto(p)}</p>
                <p className="text-xs text-ink-soft">Cuestionario {fmtFecha(p.submitted_at, { day: "numeric", month: "short" })} · pagada {fmtFecha(p.paid_at, { day: "numeric", month: "short" })}</p>
              </div>
              <span className={`num text-xs ${dias >= 3 ? "text-warn-ink" : "text-ink-soft"}`}>{dias === 0 ? "hoy" : `${dias} d`}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PacientesTabla({ rows }: { rows: PacienteFila[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-soft">
            <th className="py-2 pr-4 font-medium">Paciente</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Ruta</th>
            <th className="py-2 pr-4 font-medium">Edad · sexo</th>
            <th className="py-2 pr-4 font-medium">En el programa desde</th>
            <th className="py-2 font-medium">Alta en la web</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="py-3 pr-4">
                <Link href={`/clinica/pacientes/${p.id}`} className="flex items-center gap-3 font-medium hover:text-brand">
                  <Avatar p={p} />
                  {nombreCompleto(p)}
                </Link>
              </td>
              <td className="pr-4">
                <EstadoBadge phase={p.phase} />
              </td>
              <td className="pr-4 text-ink-soft">{p.route ? ROUTE_LABEL[p.route] : "Por decidir"}</td>
              <td className="num pr-4 text-ink-soft">
                {p.birth_date ? edad(p.birth_date) : "—"}
                {p.sex ? ` · ${p.sex === "mujer" ? "M" : "H"}` : ""}
              </td>
              <td className="pr-4 text-ink-soft">{fmtFecha(p.started_on)}</td>
              <td className="text-ink-soft">{fmtFecha(p.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
