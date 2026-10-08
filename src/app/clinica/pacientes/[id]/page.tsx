import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardTitle, EmptyState, Icon, StatCard, Steps, fmtFecha, fmtNum, nombreCompleto } from "@/components/ui";
import { Avatar, EstadoBadge } from "@/components/clinic-tables";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ROUTE_LABEL } from "@/lib/clinica";
import { ANTECEDENTES, edad, imc } from "@/content/cuestionario";

export const metadata: Metadata = { title: "Ficha del paciente" };

const ETIQUETAS: Record<string, Record<string, string>> = {
  usa_glp1: { no: "No", si: "Sí, actualmente", antes: "Antes, ya no" },
  preferencia_ruta: { con_farmaco: "Valorar tratamiento médico", sin_farmaco: "Sin medicación", indiferente: "Lo que recomiende el médico" },
  actividad: { sedentaria: "Sedentaria", ligera: "Ligera", moderada: "Moderada", alta: "Alta" },
  embarazo: { no: "Ninguno", embarazo: "Embarazada", lactancia: "Lactancia", planificando: "Buscando embarazo" },
};
const ANT = Object.fromEntries(ANTECEDENTES);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-sm whitespace-pre-line sm:col-span-2">{children}</dd>
    </div>
  );
}

export default async function FichaPaciente({ params }: PageProps<"/clinica/pacientes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServer();

  // Ambas lecturas pasan por funciones que registran el acceso en la auditoría.
  const [{ data: card, error }, { data: intakeRows }] = await Promise.all([
    supabase.rpc("get_patient_card", { p_patient: id }),
    supabase.rpc("get_intake", { p_patient: id }),
  ]);
  const p = card?.[0];
  if (error || !p) notFound();
  const intake = intakeRows?.[0];
  const a = (intake?.answers ?? {}) as Record<string, unknown>;
  const v = (k: string) => (a[k] == null || a[k] === "" ? "—" : String(a[k]));
  const label = (k: string) => ETIQUETAS[k]?.[String(a[k])] ?? v(k);
  const peso = Number(a.peso_kg), altura = Number(a.altura_cm), cintura = Number(a.cintura_cm);
  const antecedentes = Array.isArray(a.antecedentes) ? (a.antecedentes as string[]) : [];
  const enviado = intake?.status === "enviado";
  const avisos = [
    a.usa_glp1 && a.usa_glp1 !== "no" ? `Tratamiento para el peso: ${label("usa_glp1").toLowerCase()}` : null,
    p.sex === "mujer" && a.embarazo && a.embarazo !== "no" ? `Embarazo / lactancia: ${label("embarazo").toLowerCase()}` : null,
    a.alergias ? "Ha indicado alergias" : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <Link href="/clinica/pacientes" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <Icon name="arrow" size={14} className="rotate-180" /> Pacientes
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <span className="scale-125"><Avatar p={p} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{nombreCompleto(p)}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {[p.birth_date ? `${edad(p.birth_date)} años` : null, p.sex === "mujer" ? "Mujer" : p.sex === "hombre" ? "Hombre" : null, p.birth_date ? `nacimiento ${fmtFecha(p.birth_date)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EstadoBadge phase={p.phase} />
          <Badge tone={p.route ? "dark" : "default"}>{p.route ? ROUTE_LABEL[p.route] : "Ruta por decidir"}</Badge>
        </div>
      </header>

      {intake && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Datos de partida declarados">
          <StatCard label="Peso" value={peso > 0 ? fmtNum(peso) : "—"} unit="kg" />
          <StatCard label="Altura" value={altura > 0 ? altura : "—"} unit="cm" />
          <StatCard label="IMC" value={peso > 0 && altura > 0 ? fmtNum(imc(peso, altura)) : "—"} />
          <StatCard label="Cintura" value={cintura > 0 ? fmtNum(cintura, 0) : "—"} unit={cintura > 0 ? "cm" : undefined} />
          <StatCard label="Cintura / altura" value={cintura > 0 && altura > 0 ? fmtNum(cintura / altura, 2) : "—"} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {!intake ? (
            <Card>
              <EmptyState icon={<Icon name="clipboard" />} title="Sin cuestionario">
                El paciente aún no ha empezado el cuestionario de acogida.
              </EmptyState>
            </Card>
          ) : (
            <>
              {avisos.length > 0 && (
                <Card tone="warn">
                  <p className="flex items-center gap-2 text-sm font-semibold text-warn-ink">
                    <Icon name="alert" size={16} /> Para revisar en la consulta
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {avisos.map((x) => (
                      <li key={x}>· {x}</li>
                    ))}
                  </ul>
                </Card>
              )}
              <Card>
                <CardTitle aside={`${enviado ? `Enviado ${fmtFecha(intake.submitted_at)}` : "Borrador"} · v${intake.form_version}`}>Cuestionario de acogida</CardTitle>
                <dl className="divide-y divide-line border-t border-line">
                  <Fila label="Objetivo">{v("objetivo")}</Fila>
                  <Fila label="Antecedentes marcados">
                    {antecedentes.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {antecedentes.map((k) => (
                          <Badge key={k} tone="warn">{ANT[k as keyof typeof ANT] ?? k}</Badge>
                        ))}
                      </span>
                    ) : (
                      "Ninguno marcado"
                    )}
                  </Fila>
                  <Fila label="Otros antecedentes">{v("otros_antecedentes")}</Fila>
                  {p.sex === "mujer" && <Fila label="Embarazo / lactancia">{label("embarazo")}</Fila>}
                  <Fila label="Medicación actual">{v("medicacion_actual")}</Fila>
                  <Fila label="Alergias">{v("alergias")}</Fila>
                  <Fila label="Tratamiento para el peso">
                    {label("usa_glp1")}
                    {a.glp1_detalle ? ` — ${v("glp1_detalle")}` : ""}
                  </Fila>
                  <Fila label="Preferencia del paciente">{label("preferencia_ruta")}</Fila>
                  <Fila label="Actividad · fuerza">
                    {label("actividad")} · <span className="num">{v("fuerza_dias")}</span> {a.fuerza_dias === 1 || a.fuerza_dias === "1" ? "día" : "días"}/semana de fuerza
                  </Fila>
                  <Fila label="Comentarios">{v("comentarios")}</Fila>
                </dl>
              </Card>
            </>
          )}
          <p className="text-xs text-ink-soft">Las respuestas son del paciente y no se han verificado. La valoración clínica corresponde al médico.</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Proceso</CardTitle>
            <Steps
              items={[
                { label: "Registro en la web", state: "done" },
                { label: "Cuestionario de acogida", detail: enviado ? fmtFecha(intake?.submitted_at) : intake ? "En borrador" : undefined, state: enviado ? "done" : "current" },
                { label: "Valoración pagada", state: p.phase ? "done" : enviado ? "current" : "todo" },
                { label: "Analítica y medición inicial", state: p.phase && !p.route ? "current" : p.route ? "done" : "todo" },
                { label: "Consulta médica", state: p.route ? "done" : "todo" },
                { label: "Ruta y plan asignados", state: p.route ? "done" : "todo" },
              ]}
            />
          </Card>
          <Card>
            <CardTitle>Consulta</CardTitle>
            <div className="space-y-2">
              {[
                ["clipboard", "Nota de consulta"],
                ["plan", "Asignar ruta y plan"],
                ["shield", "Consentimiento del tratamiento"],
                ["lab", "Receta (Colegio de Médicos)"],
                ["video", "Videoconsulta"],
              ].map(([icon, t]) => (
                <div key={t} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-ink-soft">
                  <Icon name={icon} size={16} />
                  <span className="flex-1">{t}</span>
                  <span className="text-[10px] tracking-wide uppercase">Pronto</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
