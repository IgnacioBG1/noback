import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, Icon, PageHeader, StatCard, fmtFecha, nombreCompleto } from "@/components/ui";
import { Avatar } from "@/components/clinic-tables";
import { diasDesde, getPendientes } from "@/lib/clinica";

export const metadata: Metadata = { title: "Valoraciones" };

export default async function ValoracionesPage() {
  const items = await getPendientes();
  const dias = items.map((p) => diasDesde(p.paid_at) ?? 0);
  const masDe3 = dias.filter((d) => d >= 3).length;
  const media = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0;

  return (
    <>
      <PageHeader title="Valoraciones pendientes">
        Personas que han enviado el cuestionario y pagado la valoración. El siguiente paso es la analítica y la consulta.
      </PageHeader>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={items.length} tone={items.length ? "warn" : "default"} />
        <StatCard label="Esperan más de 3 días" value={masDe3} tone={masDe3 ? "warn" : "default"} />
        <StatCard label="Espera media" value={media} unit="días" />
      </section>

      <Card>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Paciente</th>
                  <th className="py-2 pr-4 font-medium">Cuestionario enviado</th>
                  <th className="py-2 pr-4 font-medium">Valoración pagada</th>
                  <th className="py-2 pr-4 font-medium">Espera</th>
                  <th className="py-2 font-medium"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.patient_id} className="border-t border-line">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-3 font-medium">
                        <Avatar p={p} tone={dias[i] >= 3 ? "warn" : "default"} />
                        {nombreCompleto(p)}
                      </span>
                    </td>
                    <td className="pr-4 text-ink-soft">{fmtFecha(p.submitted_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="pr-4 text-ink-soft">{fmtFecha(p.paid_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={`num pr-4 ${dias[i] >= 3 ? "text-warn-ink" : "text-ink-soft"}`}>{dias[i] === 0 ? "hoy" : `${dias[i]} d`}</td>
                    <td className="text-right">
                      <Link href={`/clinica/pacientes/${p.patient_id}`} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                        Revisar <Icon name="arrow" size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Icon name="check" />} title="No hay valoraciones pendientes">
            Cuando alguien envíe el cuestionario y pague la valoración, aparecerá aquí.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
