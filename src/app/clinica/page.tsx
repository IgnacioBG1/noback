import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, EmptyState, Icon, PageHeader, StatCard } from "@/components/ui";
import { PacientesTabla, PendientesLista } from "@/components/clinic-tables";
import { diasDesde, getPacientes, getPendientes, getStaff } from "@/lib/clinica";

export const metadata: Metadata = { title: "Hoy" };

function saludo(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", hour12: false, timeZone: "Europe/Madrid" }).format(d));
  return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
}

export default async function HoyPage() {
  const [pendientes, pacientes, staff] = await Promise.all([getPendientes(), getPacientes(), getStaff()]);
  const cuenta = (f: string | null) => pacientes.filter((p) => p.phase === f).length;
  const sinPagar = pacientes.filter((p) => !p.phase).length;
  const fecha = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(new Date());
  const enEspera = pendientes.filter((p) => (diasDesde(p.paid_at) ?? 0) >= 3).length;

  return (
    <>
      <PageHeader eyebrow={fecha.charAt(0).toUpperCase() + fecha.slice(1)} title={`${saludo()}${staff.first_name ? `, ${staff.first_name}` : ""}`} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
        <StatCard label="Valoraciones pendientes" value={pendientes.length} tone={pendientes.length ? "warn" : "default"} hint={enEspera ? `${enEspera} esperan más de 3 días` : "Pagadas, sin consulta"} />
        <StatCard label="En valoración" value={cuenta("valoracion")} hint={sinPagar ? `+${sinPagar} registrados sin pagar` : "Inscritos, antes del plan"} />
        <StatCard label="En fase activa" value={cuenta("activa")} tone="brand" hint="Con plan asignado" />
        <StatCard label="Mantenimiento" value={cuenta("mantenimiento")} hint="Tras la fase activa" />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle aside={pendientes.length ? <Link href="/clinica/valoraciones" className="text-brand hover:underline">Ver todas</Link> : undefined}>
            Requiere tu atención
          </CardTitle>
          {pendientes.length ? (
            <>
              <p className="mb-2 text-sm text-ink-soft">Valoraciones pagadas con el cuestionario enviado. Revisa el cuestionario antes de la consulta.</p>
              <PendientesLista items={pendientes} limit={6} />
            </>
          ) : (
            <EmptyState icon={<Icon name="check" />} title="Todo al día">
              No hay valoraciones esperando revisión.
            </EmptyState>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Agenda de hoy</CardTitle>
          <EmptyState icon={<Icon name="calendar" />} title="Sin consultas programadas">
            Las videoconsultas se programarán desde la ficha de cada paciente.
          </EmptyState>
          <div className="mt-4 rounded-xl border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Icon name="message" size={16} className="text-ink-soft" /> Mensajes escalados por el asistente
            </p>
            <p className="mt-1 text-xs text-ink-soft">Cuando el asistente de WhatsApp derive una consulta al equipo, aparecerá aquí.</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle aside={<Link href="/clinica/pacientes" className="text-brand hover:underline">Ver todos</Link>}>Últimos pacientes</CardTitle>
        {pacientes.length ? (
          <PacientesTabla rows={pacientes.slice(0, 8)} />
        ) : (
          <EmptyState icon={<Icon name="users" />} title="Aún no hay pacientes">
            Cuando alguien se registre y te lo asignen, aparecerá aquí.
          </EmptyState>
        )}
      </Card>

      <p className="text-xs text-ink-soft">Cada acceso a datos de pacientes queda registrado en la auditoría.</p>
    </>
  );
}
