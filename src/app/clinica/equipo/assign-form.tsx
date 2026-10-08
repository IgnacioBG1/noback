"use client";
import { useActionState } from "react";
import { asignarEquipo, type EquipoState } from "./actions";

type Opt = { id: string; name: string };
const sel = "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

export function AssignForm({ patientId, doctors, trainers, doctor, trainer }: { patientId: string; doctors: Opt[]; trainers: Opt[]; doctor: string; trainer: string }) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(asignarEquipo, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="patient_id" value={patientId} />
      <label className="sr-only" htmlFor={`d-${patientId}`}>Médico</label>
      <select id={`d-${patientId}`} name="doctor" defaultValue={doctor} className={`${sel} w-44`}>
        <option value="">Sin médico</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`t-${patientId}`}>Entrenador</label>
      <select id={`t-${patientId}`} name="trainer" defaultValue={trainer} className={`${sel} w-44`}>
        <option value="">Sin entrenador</option>
        {trainers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button disabled={pending} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-bg disabled:opacity-50">
        {pending ? "…" : "Guardar"}
      </button>
      {state.ok && <span role="status" className="text-xs text-ok">{state.ok}</span>}
      {state.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}
