"use client";
import { useActionState } from "react";
import { responderPaciente, type RespuestaState } from "./actions";

export function ReplyForm({ patientId, escalationId, compact = false }: { patientId: string; escalationId?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<RespuestaState, FormData>(responderPaciente, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="patient_id" value={patientId} />
      {escalationId && <input type="hidden" name="escalation_id" value={escalationId} />}
      {escalationId && <input type="hidden" name="desde" value="bandeja" />}
      <label className="sr-only" htmlFor={`r-${escalationId ?? patientId}`}>Respuesta</label>
      <textarea
        id={`r-${escalationId ?? patientId}`}
        name="texto"
        rows={compact ? 2 : 3}
        required
        placeholder="Escribe tu respuesta al paciente"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs">
          {state.ok && <span className="text-ok">{state.ok}</span>}
          {state.error && <span className="text-danger">{state.error}</span>}
        </span>
        <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Enviando…" : "Responder"}
        </button>
      </div>
    </form>
  );
}
