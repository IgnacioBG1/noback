import type { Metadata } from "next";
import { Card, CardTitle, EmptyState, Icon, fmtFecha, fmtNum } from "@/components/ui";
import { Composicion, LoQueMediremos, PuntoDePartida } from "@/components/patient-blocks";
import { Evolucion } from "@/components/evolucion";
import { getResumenPaciente } from "@/lib/paciente";

export const metadata: Metadata = { title: "Progreso" };

export default async function ProgresoPage() {
  const r = await getResumenPaciente();
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[13px] text-ink-soft">Progreso</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Grasa fuera, músculo dentro</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Aquí verás cómo cambia tu cuerpo medida a medida: qué parte de lo que pierdes es grasa y cómo evoluciona tu fuerza.</p>
      </header>

      {r.medidas.length ? (
        <>
          <Composicion medidas={r.medidas} />
          {r.medidas.length > 1 && <Evolucion medidas={r.medidas} />}
          <Card>
            <CardTitle>Todas tus mediciones</CardTitle>
            <ul className="divide-y divide-line text-sm">
              {[...r.medidas].reverse().map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span className="text-ink-soft">{fmtFecha(m.measured_at)}</span>
                  <span className="num">
                    {[m.peso_kg != null ? `${fmtNum(m.peso_kg)} kg` : null, m.grasa_pct != null ? `${fmtNum(m.grasa_pct)} % grasa` : null, m.prension_kg != null ? `${fmtNum(m.prension_kg)} kg prensión` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Card>
          <CardTitle aside="desde el inicio">Composición corporal</CardTitle>
          <EmptyState icon={<Icon name="chart" />} title="Aún no hay mediciones">
            Tu primera medición de composición corporal y fuerza se hará en la valoración. A partir de ahí, la gráfica se irá completando.
          </EmptyState>
        </Card>
      )}

      {!r.medidas.length && (
        <>
          <PuntoDePartida answers={r.intake?.answers} />
          <LoQueMediremos />
        </>
      )}
    </div>
  );
}
