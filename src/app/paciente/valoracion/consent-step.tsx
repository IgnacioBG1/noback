"use client";
import { useActionState } from "react";
import type { ConsentDoc } from "@/content/consentimientos";
import { Card, buttonClass } from "@/components/ui";
import { firmarConsentimientos, type FormState } from "./actions";

export function ConsentStep({ docs }: { docs: ConsentDoc[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(firmarConsentimientos, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-ink-soft">
        Antes de empezar, lee las condiciones de la atención. Las dos primeras son necesarias; las otras dos son opcionales y
        puedes cambiarlas cuando quieras.
      </p>
      {docs.map((d) => (
        <Card key={d.kind} className="p-5">
          <details>
            <summary className="cursor-pointer font-semibold">
              {d.title} {d.required ? "" : <span className="font-normal text-ink-soft">(opcional)</span>}
            </summary>
            <div className="mt-3 space-y-2 text-sm text-ink-soft">
              {d.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">Versión {d.version}</p>
          </details>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" name={d.kind} required={d.required} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>{d.checkbox}</span>
          </label>
        </Card>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className={buttonClass} disabled={pending}>
        {pending ? "Guardando…" : "Aceptar y continuar"}
      </button>
    </form>
  );
}
