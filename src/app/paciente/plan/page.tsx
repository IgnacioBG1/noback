import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardTitle, Icon, StatCard, fmtFecha } from "@/components/ui";
import { fase as faseDe } from "@/content/essential";
import { ProtocoloFase } from "@/components/protocolo-fase";
import { getResumenPaciente } from "@/lib/paciente";

export const metadata: Metadata = { title: "Mi plan" };

const FASES = [
  { key: "valoracion", t: "Valoración", d: "Analítica, medición de composición corporal y fuerza, y consulta médica." },
  { key: "activa", t: "Fase activa", d: "Pierdes grasa protegiendo el músculo: alimentación alta en proteína, fuerza y seguimiento médico." },
  { key: "mantenimiento", t: "Mantenimiento", d: "Consolidas el resultado y reduces el acompañamiento poco a poco para no recuperar lo perdido." },
];

const PILARES = [
  { icon: "plan", t: "Proteína suficiente", d: "Cada comida se construye alrededor de la proteína para cuidar el músculo." },
  { icon: "grip", t: "Entrenamiento de fuerza", d: "Sesiones cortas adaptadas a tu nivel, en casa o en el gimnasio." },
  { icon: "chart", t: "Medir, no adivinar", d: "Seguimos tu grasa, tu masa magra y tu fuerza, no solo el peso." },
  { icon: "team", t: "Equipo humano", d: "Tu médico decide; el asistente te acompaña a diario y avisa al equipo." },
];

export default async function PlanPage({ searchParams }: PageProps<"/paciente/plan">) {
  const sp = await searchParams;
  const r = await getResumenPaciente();
  const fase = r.inscripcion?.phase ?? null;
  const idx = fase ? FASES.findIndex((f) => f.key === fase) : -1;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[13px] text-ink-soft">Mi plan</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
          {r.plan ? (r.plan.route === "farmaco" ? "Ruta con tratamiento farmacológico" : "Ruta sin fármaco · dieta proteinada") : "Tu plan se decide en la consulta"}
        </h1>
        {!r.plan && (
          <p className="mt-1 max-w-2xl text-ink-soft">
            Tras tu analítica y la medición inicial, tu médico revisará tu caso y elegirá contigo la ruta que mejor encaja. Aquí verás tu plan en cuanto esté listo.
          </p>
        )}
      </header>

      {sp.firmado === "1" && (
        <p role="status" className="rounded-xl border border-brand bg-brand-soft px-4 py-3 text-sm text-brand">
          Consentimiento firmado. Tu plan ya está en marcha.
        </p>
      )}

      {r.plan && r.consentimiento && !r.consentimiento.firmado && (
        <Card tone="warn">
          <p className="flex items-center gap-2 font-semibold text-warn-ink">
            <Icon name="shield" size={18} /> Antes de empezar, firma el consentimiento de tu tratamiento
          </p>
          <p className="mt-1 text-sm">Explica en qué consiste, sus beneficios, sus riesgos y las alternativas. Léelo con calma.</p>
          <Link href="/paciente/plan/consentimiento" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-warn px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Leer y firmar <Icon name="arrow" size={16} />
          </Link>
        </Card>
      )}

      {r.plan && (
        <>
          <section className="grid grid-cols-3 gap-3" aria-label="Tus objetivos">
            <StatCard label="Proteína al día" value={r.plan.proteina_g_dia ?? "—"} unit={r.plan.proteina_g_dia ? "g" : undefined} tone="brand" />
            <StatCard label="Fuerza a la semana" value={r.plan.fuerza_sesiones_semana ?? "—"} unit={r.plan.fuerza_sesiones_semana != null ? "sesiones" : undefined} />
            <StatCard label="Pasos al día" value={r.plan.pasos_dia ? r.plan.pasos_dia.toLocaleString("es-ES") : "—"} />
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle aside={r.plan.proxima_revision ? `próxima revisión ${fmtFecha(r.plan.proxima_revision, { day: "numeric", month: "long" })}` : undefined}>
                {r.plan.route === "farmaco" ? "Tu tratamiento" : "Tu dieta"}
              </CardTitle>
              {r.plan.route === "farmaco" ? (
                <p className="text-[15px] whitespace-pre-line">{r.plan.medicacion}</p>
              ) : (
                <p className="text-sm text-ink-soft">Dieta proteinada del Método Essential, por fases. Tu fase de ahora y todo lo que puedes comer y beber está justo debajo.</p>
              )}
              {r.consentimiento?.firmado && (
                <Link href="/paciente/plan/consentimiento" className="mt-4 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-brand">
                  <Icon name="shield" size={14} /> Consentimiento firmado el {fmtFecha(r.consentimiento.fecha)}
                </Link>
              )}
            </Card>
            <Card>
              <CardTitle>Indicaciones de tu médico</CardTitle>
              <p className="text-[15px] whitespace-pre-line">{r.plan.indicaciones || "Tu médico no ha añadido indicaciones adicionales."}</p>
            </Card>
          </div>
          {r.plan.route === "sin_farmaco" && faseDe(r.plan.fase_dieta) && (
            <ProtocoloFase
              fase={faseDe(r.plan.fase_dieta)!}
              productosDia={r.plan.productos_dia}
              periodoDias={r.plan.periodo_dias}
              inicio={r.plan.fase_inicio}
              mixtoOpcion={r.plan.mixto_opcion}
              suplementos={r.plan.suplementos ?? []}
            />
          )}
        </>
      )}

      <Card>
        <CardTitle>Las fases del programa</CardTitle>
        <ol className="grid gap-3 sm:grid-cols-3">
          {FASES.map((f, i) => (
            <li key={f.key} className={`rounded-xl border p-4 ${i === idx ? "border-brand bg-brand-soft" : "border-line"}`} aria-current={i === idx ? "step" : undefined}>
              <div className="flex items-center justify-between">
                <span className="num text-xs text-ink-soft">0{i + 1}</span>
                {i === idx && <Badge tone="brand">Estás aquí</Badge>}
                {i < idx && <Icon name="check" size={16} className="text-brand" />}
              </div>
              <p className="mt-2 font-medium">{f.t}</p>
              <p className="mt-1 text-xs text-ink-soft">{f.d}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className={`grid gap-4 ${r.plan ? "" : "lg:grid-cols-2"}`}>
        {!r.plan && (
        <Card>
          <CardTitle>Dos rutas, un mismo objetivo</CardTitle>
          <div className="space-y-3">
            {[
              ["Con tratamiento médico", "Si tu médico lo considera indicado, un tratamiento con receta acompañado de proteína y fuerza para no perder músculo.", "farmaco"],
              ["Sin medicación", "Dieta proteinada por fases, supervisada por el médico, con entrenamiento de fuerza.", "sin_farmaco"],
            ].map(([t, d, k]) => (
              <div key={k} className={`rounded-xl border p-4 ${r.inscripcion?.route === k ? "border-brand bg-brand-soft" : "border-line"}`}>
                <p className="flex items-center justify-between font-medium">
                  {t}
                  {r.inscripcion?.route === k && <Badge tone="brand">Tu ruta</Badge>}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">La decisión es siempre médica y la tomáis juntos en la consulta.</p>
        </Card>
        )}
        <Card>
          <CardTitle>En qué se basa</CardTitle>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PILARES.map((p) => (
              <li key={p.t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg text-brand">
                  <Icon name={p.icon} size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium">{p.t}</span>
                  <span className="text-xs text-ink-soft">{p.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
