"use client";
import { useActionState } from "react";
import { inputClass } from "@/components/ui";
import { invitarPaciente, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(invitarPaciente, {});
  return (
    <details className="rounded-2xl border border-line bg-surface p-5 open:pb-6">
      <summary className="cursor-pointer text-[15px] font-semibold">Invitar a un paciente</summary>
      <p className="mt-1 text-sm text-ink-soft">Le llega un correo con un botón: entra sin contraseña y empieza directamente su valoración.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Nombre</span>
          <input name="first_name" required maxLength={80} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Apellidos</span>
          <input name="last_name" required maxLength={120} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Correo</span>
          <input name="email" type="email" required className={inputClass} />
        </label>
        <button disabled={pending} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Enviando…" : "Enviar invitación"}
        </button>
      </form>
      {state.ok && <p role="status" className="mt-3 text-sm text-ok">{state.ok}</p>}
      {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
    </details>
  );
}
