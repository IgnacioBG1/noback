import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, Icon, Steps } from "@/components/ui";
import { LoQueMediremos, PuntoDePartida } from "@/components/patient-blocks";
import { getResumenPaciente, recorrido } from "@/lib/paciente";
import type { Paso } from "@/lib/valoracion";
import { PHASE_LABEL } from "@/lib/clinica-labels";

export const metadata: Metadata = { title: "Inicio" };

const siguiente: Record<Paso, { titulo: string; texto: string; cta?: string }> = {
  consentimientos: {
    titulo: "Empieza tu valoración",
    texto: "Son unos 10 minutos: aceptar las condiciones de la atención, un cuestionario de salud y el pago de la valoración.",
    cta: "Empezar",
  },
  cuestionario: { titulo: "Completa tu cuestionario de salud", texto: "Tu médico lo revisará antes de la consulta. Puedes guardarlo y seguir más tarde.", cta: "Continuar el cuestionario" },
  pago: { titulo: "Último paso: el pago de la valoración", texto: "Incluye la analítica, la medición inicial y la consulta con tu médico.", cta: "Ir al pago" },
  pendiente_pago: { titulo: "Tu pago está pendiente", texto: "Si no llegaste a completarlo, puedes intentarlo de nuevo.", cta: "Completar el pago" },
  recibida: { titulo: "Valoración en marcha", texto: "Hemos recibido tu cuestionario y tu pago. Te contactaremos para organizar la analítica y la consulta con tu médico." },
};

export default async function InicioPaciente() {
  const r = await getResumenPaciente();
  const s = siguiente[r.paso];
  const fase = r.inscripcion ? PHASE_LABEL[r.inscripcion.phase] : "Antes de empezar";

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[13px] text-ink-soft">{fase}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Hola{r.profile?.first_name ? `, ${r.profile.first_name}` : ""}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card tone={r.paso === "recibida" ? "dark" : "brand"}>
            <p className={`text-xs font-medium tracking-wide uppercase ${r.paso === "recibida" ? "text-side-soft" : "text-white/70"}`}>Siguiente paso</p>
            <h2 className="mt-2 text-lg font-semibold">{s.titulo}</h2>
            <p className={`mt-1 text-sm ${r.paso === "recibida" ? "text-side-soft" : "text-white/85"}`}>{s.texto}</p>
            {s.cta && (
              <Link href="/paciente/valoracion" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft">
                {s.cta} <Icon name="arrow" size={16} />
              </Link>
            )}
          </Card>
          <PuntoDePartida answers={r.intake?.answers} />
          <LoQueMediremos />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle>Tu recorrido</CardTitle>
            <Steps items={recorrido(r)} />
          </Card>
          <Card>
            <CardTitle>Tu equipo</CardTitle>
            <ul className="space-y-3 text-sm">
              {[
                ["team", "Tu médico", "Se te asignará para la consulta de valoración."],
                ["grip", "Tu entrenador", "Diseñará tu plan de fuerza cuando empieces."],
                ["message", "Asistente por WhatsApp", "Te acompañará en el día a día y avisará al equipo si hace falta."],
              ].map(([i, t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-ink-soft">
                    <Icon name={i} size={18} />
                  </span>
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="text-xs text-ink-soft">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="px-1 text-xs text-ink-soft">
            Ante cualquier urgencia de salud, llama al 112. Si tienes dudas, escríbenos a{" "}
            <a href="mailto:info@longevidadysalud.com" className="text-brand hover:underline">info@longevidadysalud.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
