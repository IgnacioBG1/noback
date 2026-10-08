import type { Metadata } from "next";
import { Card, CardTitle, EmptyState, Icon } from "@/components/ui";
import { LoQueMediremos, PuntoDePartida } from "@/components/patient-blocks";
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

      <Card>
        <CardTitle aside="desde el inicio">Composición corporal</CardTitle>
        <div>
          <EmptyState icon={<Icon name="chart" />} title="Aún no hay mediciones">
            Tu primera medición de composición corporal y fuerza se hará en la valoración. A partir de ahí, la gráfica se irá completando.
          </EmptyState>
        </div>
      </Card>

      <PuntoDePartida answers={r.intake?.answers} />
      <LoQueMediremos />
    </div>
  );
}
