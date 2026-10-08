import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardTitle, EmptyState, Icon, StatCard, Steps, fmtFecha, fmtNum, linkButtonClass, nombreCompleto } from "@/components/ui";
import { KIND_LABEL, MODALITY_LABEL, normalizaMedicion, type Historia } from "@/lib/historia";
import { TREATMENT_CONSENT_FOR_ROUTE } from "@/content/consentimientos";
import { fase as faseDe, faseNombre, SUPLEMENTOS } from "@/content/essential";
import { CambiarFaseForm } from "./fase-form";
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

export default async function FichaPaciente({ params, searchParams }: PageProps<"/clinica/pacientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServer();

  // Ambas lecturas pasan por funciones que registran el acceso en la auditoría.
  const [{ data: card, error }, { data: intakeRows }, { data: rec }, { data: consents }] = await Promise.all([
    supabase.rpc("get_patient_card", { p_patient: id }),
    supabase.rpc("get_intake", { p_patient: id }),
    supabase.rpc("get_clinical_record", { p_patient: id }),
    supabase.from("consents").select("kind, granted, text_version, created_at").eq("user_id", id).in("kind", ["tratamiento_glp1", "dieta_proteinada"]).order("created_at", { ascending: false }),
  ]);
  const p = card?.[0];
  if (error || !p) notFound();
  const h = (rec ?? { encounters: [], measurements: [], plans: [] }) as Historia;
  const medidas = h.measurements.map((m) => normalizaMedicion(m as unknown as Record<string, unknown>));
  const plan = h.plans[0] ?? null;
  const ultima = medidas.length ? medidas[medidas.length - 1] : null;
  const consentKind = plan ? TREATMENT_CONSENT_FOR_ROUTE[plan.route] : null;
  const consent = consentKind ? (consents ?? []).find((c) => c.kind === consentKind) : undefined;
  const firmado = !!consent?.granted;
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
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge phase={p.phase} />
          <Badge tone={p.route ? "dark" : "default"}>{p.route ? ROUTE_LABEL[p.route] : "Ruta por decidir"}</Badge>
          <Link href={`/clinica/pacientes/${id}/consulta`} className={`${linkButtonClass} ml-1`}>
            <Icon name="clipboard" size={16} /> Registrar consulta
          </Link>
        </div>
      </header>
      {sp.guardado === "1" && (
        <p role="status" className="rounded-xl border border-brand bg-brand-soft px-4 py-3 text-sm text-brand">
          Consulta guardada en la historia.
        </p>
      )}

      {ultima ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Última medición">
          <StatCard label="Peso" value={ultima.peso_kg != null ? fmtNum(ultima.peso_kg) : "—"} unit="kg" hint={`medido ${fmtFecha(ultima.measured_at, { day: "numeric", month: "short" })}`} />
          <StatCard label="IMC" value={ultima.peso_kg != null && altura > 0 ? fmtNum(imc(ultima.peso_kg, altura)) : "—"} hint={altura > 0 ? `altura ${altura} cm` : undefined} />
          <StatCard label="Grasa corporal" value={ultima.grasa_pct != null ? fmtNum(ultima.grasa_pct) : "—"} unit="%" />
          <StatCard label="Masa magra" value={ultima.masa_magra_kg != null ? fmtNum(ultima.masa_magra_kg) : "—"} unit="kg" />
          <StatCard label="Cintura / altura" value={ultima.cintura_cm != null && altura > 0 ? fmtNum(ultima.cintura_cm / altura, 2) : "—"} />
        </section>
      ) : intake ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Datos de partida declarados">
          <StatCard label="Peso" value={peso > 0 ? fmtNum(peso) : "—"} unit="kg" hint="declarado" />
          <StatCard label="Altura" value={altura > 0 ? altura : "—"} unit="cm" />
          <StatCard label="IMC" value={peso > 0 && altura > 0 ? fmtNum(imc(peso, altura)) : "—"} />
          <StatCard label="Cintura" value={cintura > 0 ? fmtNum(cintura, 0) : "—"} unit={cintura > 0 ? "cm" : undefined} />
          <StatCard label="Cintura / altura" value={cintura > 0 && altura > 0 ? fmtNum(cintura / altura, 2) : "—"} />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Mediciones medidas={medidas} />
          <Consultas h={h} patientId={id} />
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
                { label: "Analítica y medición inicial", state: medidas.length ? "done" : p.phase ? "current" : "todo" },
                { label: "Consulta médica", detail: h.encounters.length ? fmtFecha(h.encounters[h.encounters.length - 1].occurred_at) : undefined, state: h.encounters.length ? "done" : p.phase && medidas.length ? "current" : "todo" },
                { label: "Ruta y plan asignados", state: plan ? "done" : h.encounters.length ? "current" : "todo" },
                { label: "Consentimiento del tratamiento", detail: firmado ? fmtFecha(consent?.created_at) : plan ? "Pendiente de firma en la app" : undefined, state: firmado ? "done" : plan ? "current" : "todo" },
              ]}
            />
          </Card>
          <PlanCard plan={plan} firmado={firmado} consentAt={consent?.created_at ?? null} patientId={id} />
          <p className="flex gap-2 px-1 text-xs text-ink-soft">
            <Icon name="shield" size={14} className="mt-0.5 shrink-0" />
            La receta (plataforma del Colegio de Médicos) y la videoconsulta se hacen fuera de NoBack. Deja la referencia en el plan de la nota.
          </p>
        </div>
      </div>
    </>
  );
}

function PlanCard({ plan, firmado, consentAt, patientId }: { plan: Historia["plans"][number] | null; firmado: boolean; consentAt: string | null; patientId: string }) {
  if (!plan)
    return (
      <Card>
        <CardTitle>Plan</CardTitle>
        <EmptyState icon={<Icon name="plan" />} title="Sin plan asignado">
          Se asigna al registrar la consulta de valoración.
        </EmptyState>
      </Card>
    );
  const filas: [string, React.ReactNode][] = [
    ["Ruta", ROUTE_LABEL[plan.route]],
    ...(plan.route === "farmaco" ? ([["Medicación", plan.medicacion ?? "—"]] as [string, React.ReactNode][]) : []),
    ...(plan.route === "sin_farmaco"
      ? ([
          [
            "Fase",
            <span key="f" className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: faseDe(plan.fase_dieta)?.color }} />
              {faseNombre(plan.fase_dieta)}
              {plan.mixto_opcion ? ` · opción ${plan.mixto_opcion}` : ""}
            </span>,
          ],
          ["Productos Essential", plan.productos_dia != null ? <span className="num">{plan.productos_dia} /día</span> : "—"],
          ["Periodo", plan.periodo_dias ? <span><span className="num">{plan.periodo_dias}</span> días desde {fmtFecha(plan.fase_inicio, { day: "numeric", month: "short" })}</span> : "—"],
          ["Suplementos", plan.suplementos?.length ? plan.suplementos.map((k) => SUPLEMENTOS.find((x) => x.key === k)?.nombre ?? k).join(", ") : "—"],
        ] as [string, React.ReactNode][])
      : []),
    ["Proteína", plan.proteina_g_dia ? <span className="num">{plan.proteina_g_dia} g/día</span> : "—"],
    ["Fuerza", plan.fuerza_sesiones_semana != null ? <span className="num">{plan.fuerza_sesiones_semana} /semana</span> : "—"],
    ["Pasos", plan.pasos_dia ? <span className="num">{plan.pasos_dia.toLocaleString("es-ES")} /día</span> : "—"],
    ["Próxima revisión", fmtFecha(plan.proxima_revision)],
  ];
  return (
    <Card>
      <CardTitle aside={`desde ${fmtFecha(plan.created_at, { day: "numeric", month: "short" })}`}>Plan vigente</CardTitle>
      <dl className="divide-y divide-line text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right whitespace-pre-line">{v}</dd>
          </div>
        ))}
      </dl>
      {plan.route === "sin_farmaco" && (
        <CambiarFaseForm patientId={patientId} fase={plan.fase_dieta} productosDia={plan.productos_dia} periodoDias={plan.periodo_dias} mixto={plan.mixto_opcion} />
      )}
      <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${firmado ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn-ink"}`}>
        {firmado ? `Consentimiento firmado el ${fmtFecha(consentAt)}` : "Consentimiento del tratamiento pendiente de firma"}
      </div>
    </Card>
  );
}

function Mediciones({ medidas }: { medidas: ReturnType<typeof normalizaMedicion>[] }) {
  if (!medidas.length) return null;
  const cols: [keyof ReturnType<typeof normalizaMedicion>, string, number][] = [
    ["peso_kg", "Peso", 1],
    ["grasa_pct", "Grasa %", 1],
    ["masa_magra_kg", "Magra kg", 1],
    ["cintura_cm", "Cintura", 0],
    ["prension_kg", "Prensión", 1],
  ];
  return (
    <Card>
      <CardTitle aside={`${medidas.length} medición${medidas.length === 1 ? "" : "es"}`}>Mediciones</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft">
              <th className="py-2 pr-4 font-medium">Fecha</th>
              {cols.map(([, l]) => (
                <th key={l} className="py-2 pr-4 text-right font-medium">{l}</th>
              ))}
              <th className="py-2 text-right font-medium">TA</th>
            </tr>
          </thead>
          <tbody>
            {[...medidas].reverse().map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="py-2.5 pr-4 text-ink-soft">{fmtFecha(m.measured_at)}</td>
                {cols.map(([k, l, d]) => (
                  <td key={l} className="num pr-4 text-right">{m[k] != null ? fmtNum(m[k] as number, d) : "—"}</td>
                ))}
                <td className="num text-right">{m.ta_sistolica && m.ta_diastolica ? `${m.ta_sistolica}/${m.ta_diastolica}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Consultas({ h, patientId }: { h: Historia; patientId: string }) {
  if (!h.encounters.length) return null;
  const corregida = new Set(h.encounters.map((e) => e.corrects).filter(Boolean));
  const secciones: [keyof Historia["encounters"][number], string][] = [
    ["subjetivo", "Subjetivo"],
    ["objetivo", "Objetivo"],
    ["valoracion", "Valoración"],
    ["plan", "Plan"],
  ];
  return (
    <Card>
      <CardTitle aside={`${h.encounters.length}`}>Consultas</CardTitle>
      <ol className="space-y-4">
        {h.encounters.map((e) => (
          <li key={e.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{e.motivo || KIND_LABEL[e.kind]}</span>
              <Badge>{KIND_LABEL[e.kind]}</Badge>
              <Badge>{MODALITY_LABEL[e.modality]}</Badge>
              {e.corrects && <Badge tone="warn">Corrección</Badge>}
              {corregida.has(e.id) && <Badge tone="warn">Tiene corrección</Badge>}
              <span className="ml-auto text-xs text-ink-soft">
                {fmtFecha(e.occurred_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {e.author ? ` · ${e.author}` : ""}
              </span>
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {secciones
                .filter(([k]) => e[k])
                .map(([k, l]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-soft">{l}</dt>
                    <dd className="whitespace-pre-line">{String(e[k])}</dd>
                  </div>
                ))}
            </dl>
            <Link href={`/clinica/pacientes/${patientId}/consulta?corrige=${e.id}`} className="mt-3 inline-block text-xs text-ink-soft hover:text-brand">
              Añadir corrección
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
