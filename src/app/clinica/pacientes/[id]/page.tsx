import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { createSupabaseServer } from "@/lib/supabase/server";
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
      <dd className="text-sm sm:col-span-2">{children}</dd>
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
  const peso = Number(a.peso_kg), altura = Number(a.altura_cm);

  return (
    <div className="space-y-6">
      <Link href="/clinica" className="text-sm text-ink-soft hover:text-ink">
        ← Volver
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "Paciente"}</h1>
        <p className="mt-1 text-ink-soft">
          {[p.birth_date ? `${edad(p.birth_date)} años` : null, p.sex === "mujer" ? "Mujer" : p.sex === "hombre" ? "Hombre" : null, p.phase ? `Fase: ${p.phase}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {!intake ? (
        <Card>
          <p className="text-ink-soft">El paciente aún no ha empezado el cuestionario.</p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Cuestionario de acogida</h2>
            <span className="text-xs text-ink-soft">
              {intake.status === "enviado" ? "Enviado" : "Borrador"} · versión {intake.form_version}
            </span>
          </div>
          <dl className="mt-2 divide-y divide-line">
            <Fila label="Peso · altura · cintura">
              {v("peso_kg")} kg · {v("altura_cm")} cm · {a.cintura_cm ? `${v("cintura_cm")} cm` : "—"}
              {peso > 0 && altura > 0 && <span className="ml-2 text-ink-soft">(IMC {imc(peso, altura)})</span>}
            </Fila>
            <Fila label="Objetivo">{v("objetivo")}</Fila>
            <Fila label="Antecedentes">
              {Array.isArray(a.antecedentes) && a.antecedentes.length ? (
                <ul className="list-disc pl-4">
                  {(a.antecedentes as string[]).map((k) => (
                    <li key={k}>{ANT[k as keyof typeof ANT] ?? k}</li>
                  ))}
                </ul>
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
            <Fila label="Preferencia">{label("preferencia_ruta")}</Fila>
            <Fila label="Actividad · fuerza">
              {label("actividad")} · {v("fuerza_dias")} días/semana
            </Fila>
            <Fila label="Comentarios">{v("comentarios")}</Fila>
          </dl>
        </Card>
      )}
      <p className="text-xs text-ink-soft">Las respuestas son del paciente y no se han verificado. La valoración clínica corresponde al médico.</p>
    </div>
  );
}
