"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, buttonClass, ghostButtonClass, inputClass } from "@/components/ui";
import { registrarConsulta, type ConsultaState } from "./actions";

type Plan = {
  route: string;
  proteina_g_dia: number | null;
  fuerza_sesiones_semana: number | null;
  pasos_dia: number | null;
  fase_dieta: string | null;
  medicacion: string | null;
  indicaciones: string | null;
} | null;

const s = (v: unknown) => (v == null ? "" : String(v));

function Field({ label, name, error, hint, className = "", children }: { label: string; name: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`text-sm ${className}`}>
      <label htmlFor={name} className="mb-1 block font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Chips({ name, options, value, onChange }: { name: string; options: [string, string][]; value: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
          <input type="radio" name={name} value={v} defaultChecked={value === v} onChange={() => onChange?.(v)} className="sr-only" />
          {l}
        </label>
      ))}
    </div>
  );
}

const MEDIDAS: [string, string, string][] = [
  ["peso_kg", "Peso", "kg"],
  ["grasa_pct", "Grasa corporal", "%"],
  ["masa_magra_kg", "Masa magra", "kg"],
  ["cintura_cm", "Cintura", "cm"],
  ["prension_kg", "Prensión (mejor mano)", "kg"],
  ["ta_sistolica", "TA sistólica", "mmHg"],
  ["ta_diastolica", "TA diastólica", "mmHg"],
  ["fc_lpm", "Frecuencia cardiaca", "lpm"],
];

export function ConsultaForm({
  patientId,
  ahora,
  primera,
  planActual,
  corrige,
}: {
  patientId: string;
  ahora: string;
  primera: boolean;
  planActual: Plan;
  corrige?: { id: string; fecha: string };
}) {
  const [state, action, pending] = useActionState<ConsultaState, FormData>(registrarConsulta, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [conPlan, setConPlan] = useState(primera && !corrige);
  const [route, setRoute] = useState(planActual?.route ?? "");
  const e = state.fieldErrors ?? {};

  return (
    <form
      ref={formRef}
      noValidate
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (formRef.current) {
          const fd = new FormData(formRef.current);
          startTransition(() => action(fd));
        }
      }}
    >
      <input type="hidden" name="patient_id" value={patientId} />
      {corrige && <input type="hidden" name="corrects" value={corrige.id} />}

      <Card>
        <CardTitle>{corrige ? `Corrección de la nota del ${corrige.fecha}` : "Consulta"}</CardTitle>
        {corrige && (
          <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">
            La nota original no se modifica: esta corrección queda enlazada a ella en la historia.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Tipo" name="kind" error={e.kind}>
            <Chips name="kind" value={corrige ? "otra" : primera ? "valoracion" : "seguimiento"} options={[["valoracion", "Valoración"], ["seguimiento", "Seguimiento"], ["otra", "Otra"]]} />
          </Field>
          <Field label="Modalidad" name="modality" error={e.modality}>
            <Chips name="modality" value="video" options={[["video", "Vídeo"], ["presencial", "Presencial"], ["telefono", "Teléfono"]]} />
          </Field>
          <Field label="Fecha y hora" name="occurred_at" error={e.occurred_at}>
            <input id="occurred_at" name="occurred_at" type="datetime-local" defaultValue={ahora} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="Motivo" name="motivo" error={e.motivo}>
            <input id="motivo" name="motivo" className={inputClass} placeholder={primera ? "Valoración inicial del programa" : ""} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Subjetivo · lo que cuenta el paciente" name="subjetivo" error={e.subjetivo}>
              <textarea id="subjetivo" name="subjetivo" rows={5} className={inputClass} />
            </Field>
            <Field label="Objetivo · exploración y pruebas" name="objetivo" error={e.objetivo}>
              <textarea id="objetivo" name="objetivo" rows={5} className={inputClass} />
            </Field>
            <Field label="Valoración · juicio clínico" name="valoracion" error={e.valoracion}>
              <textarea id="valoracion" name="valoracion" rows={5} className={inputClass} />
            </Field>
            <Field label="Plan · conducta" name="plan" error={e.plan} hint="Incluye aquí la receta emitida en la plataforma del Colegio de Médicos (número o referencia).">
              <textarea id="plan" name="plan" rows={5} className={inputClass} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle aside="opcional · se mostrarán al paciente en Progreso">Mediciones</CardTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {MEDIDAS.map(([n, l, u]) => (
            <Field key={n} label={l} name={n} error={e[n]}>
              <div className="relative">
                <input id={n} name={n} inputMode="decimal" className={`${inputClass} num pr-12`} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">{u}</span>
              </div>
            </Field>
          ))}
        </div>
      </Card>

      <Card tone={conPlan ? "default" : "default"}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="asignar_plan" checked={conPlan} onChange={(ev) => setConPlan(ev.target.checked)} className="mt-1 size-4 accent-[var(--brand)]" />
          <span>
            <span className="block font-semibold">{planActual ? "Cambiar el plan" : "Asignar ruta y plan"}</span>
            <span className="text-sm text-ink-soft">
              {planActual
                ? "Crea un plan nuevo que sustituye al actual. El anterior queda en la historia."
                : "El paciente pasa a fase activa y se le pedirá que firme el consentimiento de su tratamiento en la app."}
            </span>
          </span>
        </label>

        {conPlan && (
          <div className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-3">
            <Field label="Ruta" name="route" error={e.route} className="md:col-span-3">
              <Chips name="route" value={route} onChange={setRoute} options={[["farmaco", "Con tratamiento farmacológico"], ["sin_farmaco", "Sin fármaco · dieta proteinada"]]} />
            </Field>
            <Field label="Proteína" name="proteina_g_dia" error={e.proteina_g_dia} hint="gramos al día">
              <input id="proteina_g_dia" name="proteina_g_dia" inputMode="numeric" defaultValue={s(planActual?.proteina_g_dia)} className={`${inputClass} num`} />
            </Field>
            <Field label="Fuerza" name="fuerza_sesiones_semana" error={e.fuerza_sesiones_semana} hint="sesiones por semana">
              <input id="fuerza_sesiones_semana" name="fuerza_sesiones_semana" inputMode="numeric" defaultValue={s(planActual?.fuerza_sesiones_semana)} className={`${inputClass} num`} />
            </Field>
            <Field label="Pasos" name="pasos_dia" error={e.pasos_dia} hint="objetivo diario">
              <input id="pasos_dia" name="pasos_dia" inputMode="numeric" defaultValue={s(planActual?.pasos_dia)} className={`${inputClass} num`} />
            </Field>
            {route === "farmaco" && (
              <Field label="Medicamento, dosis y pauta" name="medicacion" error={e.medicacion} hint="Lo verá el paciente en su plan." className="md:col-span-3">
                <textarea id="medicacion" name="medicacion" rows={2} defaultValue={s(planActual?.medicacion)} className={inputClass} />
              </Field>
            )}
            {route === "sin_farmaco" && (
              <Field label="Fase de la dieta" name="fase_dieta" error={e.fase_dieta} className="md:col-span-3">
                <Chips name="fase_dieta" value={s(planActual?.fase_dieta) || "fase_1"} options={[["fase_1", "Fase 1"], ["fase_2", "Fase 2"], ["fase_3", "Fase 3"], ["reintroduccion", "Reintroducción"]]} />
              </Field>
            )}
            <Field label="Indicaciones para el paciente" name="indicaciones" error={e.indicaciones} hint="Texto que verá en su app, en lenguaje sencillo." className="md:col-span-2">
              <textarea id="indicaciones" name="indicaciones" rows={4} defaultValue={s(planActual?.indicaciones)} className={inputClass} />
            </Field>
            <Field label="Próxima revisión" name="proxima_revision" error={e.proxima_revision}>
              <input id="proxima_revision" name="proxima_revision" type="date" className={inputClass} />
            </Field>
          </div>
        )}
      </Card>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/clinica/pacientes/${patientId}`} className={ghostButtonClass}>
          Cancelar
        </Link>
        <button className={`${buttonClass} sm:w-auto`} disabled={pending}>
          {pending ? "Guardando…" : "Guardar en la historia"}
        </button>
      </div>
      <p className="text-right text-xs text-ink-soft">Una vez guardada, la nota no se puede modificar; las correcciones se añaden como notas nuevas.</p>
    </form>
  );
}
