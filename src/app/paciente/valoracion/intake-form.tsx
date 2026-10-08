"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import { ANTECEDENTES } from "@/content/cuestionario";
import { Card, inputClass } from "@/components/ui";
import { guardarCuestionario, type FormState } from "./actions";

type Initial = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
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

function Radios({ name, options, value }: { name: string; options: [string, string][]; value: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
          <input type="radio" name={name} value={v} defaultChecked={value === v} className="accent-[var(--brand)]" />
          {l}
        </label>
      ))}
    </div>
  );
}

export function IntakeForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState<FormState, FormData>(guardarCuestionario, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Envío manual: evita que React vacíe el formulario si hay errores de validación.
  const submit = (accion: "enviar" | "borrador") => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("_accion", accion);
    startTransition(() => action(fd));
  };
  const [sex, setSex] = useState(str(initial.sex));
  const [glp1, setGlp1] = useState(str(initial.usa_glp1) || "no");
  const e = state.fieldErrors ?? {};
  const antecedentes = new Set(Array.isArray(initial.antecedentes) ? (initial.antecedentes as string[]) : []);

  return (
    <form
      ref={formRef}
      className="space-y-6"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        submit("enviar");
      }}
    >
      <p className="text-ink-soft">
        Tu médico revisará todas tus respuestas antes de la consulta. Ninguna respuesta te excluye automáticamente. Puedes guardar
        y seguir más tarde.
      </p>

      <Card className="space-y-5">
        <h2 className="font-semibold">Datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento" name="birth_date" error={e.birth_date}>
            <input id="birth_date" name="birth_date" type="date" className={inputClass} defaultValue={str(initial.birth_date)} />
          </Field>
          <Field label="Sexo biológico" name="sex" error={e.sex}>
            <select id="sex" name="sex" className={inputClass} value={sex} onChange={(ev) => setSex(ev.target.value)}>
              <option value="">Selecciona…</option>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
            </select>
          </Field>
          <Field label="Peso (kg)" name="peso_kg" error={e.peso_kg}>
            <input id="peso_kg" name="peso_kg" inputMode="decimal" className={inputClass} defaultValue={str(initial.peso_kg)} />
          </Field>
          <Field label="Altura (cm)" name="altura_cm" error={e.altura_cm}>
            <input id="altura_cm" name="altura_cm" inputMode="numeric" className={inputClass} defaultValue={str(initial.altura_cm)} />
          </Field>
          <Field label="Cintura (cm, opcional)" name="cintura_cm" error={e.cintura_cm} hint="A la altura del ombligo, de pie y sin apretar.">
            <input id="cintura_cm" name="cintura_cm" inputMode="decimal" className={inputClass} defaultValue={str(initial.cintura_cm)} />
          </Field>
        </div>
        <Field label="¿Qué te gustaría conseguir?" name="objetivo" error={e.objetivo}>
          <textarea id="objetivo" name="objetivo" rows={3} className={inputClass} defaultValue={str(initial.objetivo)} />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Tu salud</h2>
        <fieldset className="text-sm">
          <legend className="mb-2 font-medium">¿Tienes o has tenido alguna de estas situaciones?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ANTECEDENTES.map(([k, l]) => (
              <label key={k} className="flex items-start gap-2">
                <input type="checkbox" name="antecedentes" value={k} defaultChecked={antecedentes.has(k)} className="mt-0.5 accent-[var(--brand)]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Otras enfermedades u operaciones (opcional)" name="otros_antecedentes" error={e.otros_antecedentes}>
          <textarea id="otros_antecedentes" name="otros_antecedentes" rows={2} className={inputClass} defaultValue={str(initial.otros_antecedentes)} />
        </Field>
        {sex === "mujer" && (
          <Field label="Embarazo y lactancia" name="embarazo" error={e.embarazo}>
            <Radios
              name="embarazo"
              value={str(initial.embarazo) || "no"}
              options={[
                ["no", "Ninguno"],
                ["embarazo", "Embarazada"],
                ["lactancia", "Dando el pecho"],
                ["planificando", "Buscando embarazo"],
              ]}
            />
          </Field>
        )}
        <Field label="Medicación que tomas ahora (opcional)" name="medicacion_actual" error={e.medicacion_actual} hint="Nombre y dosis, si la sabes.">
          <textarea id="medicacion_actual" name="medicacion_actual" rows={2} className={inputClass} defaultValue={str(initial.medicacion_actual)} />
        </Field>
        <Field label="Alergias (opcional)" name="alergias" error={e.alergias}>
          <input id="alergias" name="alergias" className={inputClass} defaultValue={str(initial.alergias)} />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Tratamientos para el peso</h2>
        <Field label="¿Usas o has usado medicación inyectable o en pastillas para perder peso?" name="usa_glp1" error={e.usa_glp1}>
          <div className="flex flex-wrap gap-2" onChange={(ev) => setGlp1((ev.target as HTMLInputElement).value)}>
            {[
              ["no", "No"],
              ["si", "Sí, ahora"],
              ["antes", "Antes, ya no"],
            ].map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="radio" name="usa_glp1" value={v} defaultChecked={glp1 === v} className="accent-[var(--brand)]" />
                {l}
              </label>
            ))}
          </div>
        </Field>
        {glp1 !== "no" && (
          <Field label="¿Cuál, qué dosis y desde cuándo?" name="glp1_detalle" error={e.glp1_detalle}>
            <input id="glp1_detalle" name="glp1_detalle" className={inputClass} defaultValue={str(initial.glp1_detalle)} />
          </Field>
        )}
        <Field label="¿Cómo prefieres plantear el programa?" name="preferencia_ruta" error={e.preferencia_ruta} hint="Es solo tu preferencia: el plan lo decides con tu médico.">
          <Radios
            name="preferencia_ruta"
            value={str(initial.preferencia_ruta)}
            options={[
              ["con_farmaco", "Valorar tratamiento médico"],
              ["sin_farmaco", "Sin medicación"],
              ["indiferente", "Lo que me recomiende el médico"],
            ]}
          />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-semibold">Actividad física</h2>
        <Field label="Tu nivel de actividad diaria" name="actividad" error={e.actividad}>
          <Radios
            name="actividad"
            value={str(initial.actividad)}
            options={[
              ["sedentaria", "Sedentaria"],
              ["ligera", "Ligera"],
              ["moderada", "Moderada"],
              ["alta", "Alta"],
            ]}
          />
        </Field>
        <Field label="Días por semana que haces entrenamiento de fuerza" name="fuerza_dias" error={e.fuerza_dias}>
          <select id="fuerza_dias" name="fuerza_dias" className={inputClass} defaultValue={str(initial.fuerza_dias) || "0"}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="¿Algo más que quieras contar a tu médico? (opcional)" name="comentarios" error={e.comentarios}>
          <textarea id="comentarios" name="comentarios" rows={3} className={inputClass} defaultValue={str(initial.comentarios)} />
        </Field>
      </Card>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && !state.error && <p className="text-sm text-brand">Guardado.</p>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button type="submit" disabled={pending} className="inline-flex flex-1 items-center justify-center rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-50">
          {pending ? "Guardando…" : "Enviar cuestionario"}
        </button>
        <button type="button" onClick={() => submit("borrador")} disabled={pending} className="inline-flex flex-1 items-center justify-center rounded-md border border-line px-4 py-2.5 font-medium hover:bg-brand-soft disabled:opacity-50">
          Guardar y seguir más tarde
        </button>
      </div>
      <p className="text-xs text-ink-soft">Al enviarlo ya no podrás modificarlo; si quieres corregir algo, díselo a tu médico en la consulta.</p>
    </form>
  );
}
