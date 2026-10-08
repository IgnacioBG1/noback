import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, Icon, PageHeader, inputClass } from "@/components/ui";
import { PacientesTabla } from "@/components/clinic-tables";
import { getPacientes, PHASE_LABEL } from "@/lib/clinica";

export const metadata: Metadata = { title: "Pacientes" };

const FILTROS = [
  { key: "", label: "Todos" },
  { key: "registro", label: "Registro" },
  { key: "valoracion", label: PHASE_LABEL.valoracion },
  { key: "activa", label: PHASE_LABEL.activa },
  { key: "mantenimiento", label: PHASE_LABEL.mantenimiento },
];

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default async function PacientesPage({ searchParams }: PageProps<"/clinica/pacientes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const fase = typeof sp.fase === "string" ? sp.fase : "";
  const todos = await getPacientes();
  const filas = todos.filter((p) => {
    if (fase === "registro" ? p.phase !== null : fase && p.phase !== fase) return false;
    return !q || norm(`${p.first_name ?? ""} ${p.last_name ?? ""}`).includes(norm(q));
  });
  const n = (k: string) => (k === "" ? todos.length : k === "registro" ? todos.filter((p) => !p.phase).length : todos.filter((p) => p.phase === k).length);
  const href = (k: string) => `/clinica/pacientes?${new URLSearchParams({ ...(q ? { q } : {}), ...(k ? { fase: k } : {}) })}`;

  return (
    <>
      <PageHeader title="Pacientes" actions={
        <form className="relative w-full sm:w-72" role="search">
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
          <label htmlFor="q" className="sr-only">Buscar paciente</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre" className={`${inputClass} pl-9`} />
          {fase && <input type="hidden" name="fase" value={fase} />}
        </form>
      }>
        Todas las personas a las que tienes acceso, con su fase en el programa.
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={fase === f.key ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${fase === f.key ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink"}`}
          >
            {f.label} <span className="num ml-1 text-xs opacity-70">{n(f.key)}</span>
          </Link>
        ))}
      </div>

      <Card>
        {filas.length ? (
          <PacientesTabla rows={filas} />
        ) : (
          <EmptyState icon={<Icon name="users" />} title={todos.length ? "Ningún paciente coincide" : "Aún no hay pacientes"}>
            {todos.length ? "Prueba con otro nombre o quita el filtro." : "Cuando alguien se registre y te lo asignen, aparecerá aquí."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
