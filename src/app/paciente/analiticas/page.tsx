import type { Metadata } from "next";
import { Card, CardTitle, EmptyState, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Analíticas" };

export default function AnaliticasPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[13px] text-ink-soft">Analíticas</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Tus resultados, explicados</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Cada analítica quedará guardada aquí con los comentarios de tu médico, para que veas cómo evolucionas.</p>
      </header>

      <Card>
        <EmptyState icon={<Icon name="lab" />} title="Todavía no tienes analíticas">
          Tu primera analítica forma parte de la valoración. Te avisaremos cuando los resultados estén revisados por tu médico.
        </EmptyState>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Cómo funciona</CardTitle>
          <ol className="space-y-3 text-sm">
            {[
              "Te indicamos dónde y cuándo hacerte la extracción.",
              "Tu médico revisa los resultados antes de que los veas.",
              "Los comentáis juntos en la consulta y se ajusta tu plan.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs text-brand">{i + 1}</span>
                <span className="text-ink-soft">{t}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card tone="dark">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon name="dna" size={18} /> Edad biológica
          </p>
          <p className="mt-2 text-sm text-side-soft">
            A partir de tu analítica calcularemos tu edad biológica y la compararemos con tu edad real. La repetiremos para ver cómo cambia con el programa.
          </p>
          <p className="num mt-4 text-3xl text-side-soft/60">— años</p>
        </Card>
      </div>

      <p className="flex items-start gap-2 px-1 text-xs text-ink-soft">
        <Icon name="shield" size={14} className="mt-0.5 shrink-0" /> Tus resultados solo los ven tú y tu equipo médico. Cada acceso queda registrado.
      </p>
    </div>
  );
}
