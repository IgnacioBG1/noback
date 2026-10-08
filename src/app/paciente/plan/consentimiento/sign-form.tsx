"use client";
import { useActionState } from "react";
import { buttonClass } from "@/components/ui";
import { firmarTratamiento, type FirmaState } from "../actions";

export function SignForm({ kind, version, checkbox }: { kind: string; version: string; checkbox: string }) {
  const [state, action, pending] = useActionState<FirmaState, FormData>(firmarTratamiento, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="version" value={version} />
      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
        <input type="checkbox" name="acepto" required className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
        <span>{checkbox}</span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className={buttonClass} disabled={pending}>
        {pending ? "Guardando…" : "Firmar el consentimiento"}
      </button>
      <p className="text-xs text-ink-soft">Quedará registrada la fecha, la versión del documento y una huella digital del texto que has leído.</p>
    </form>
  );
}
