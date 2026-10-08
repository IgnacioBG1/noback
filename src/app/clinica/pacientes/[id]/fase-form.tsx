"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import { FasePicker } from "@/components/fase-picker";
import { cambiarFase, type FaseState } from "./fase-actions";

export function CambiarFaseForm({ patientId, fase, productosDia, periodoDias, mixto }: { patientId: string; fase: string | null; productosDia: number | null; periodoDias: number | null; mixto: string | null }) {
  const [state, action, pending] = useActionState<FaseState, FormData>(cambiarFase, {});
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  if (!open)
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        {state.ok && <span role="status" className="text-sm text-ok">Fase actualizada.</span>}
        <button type="button" onClick={() => setOpen(true)} className="ml-auto rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-bg">
          Cambiar de fase
        </button>
      </div>
    );
  return (
    <form
      ref={ref}
      className="mt-4 space-y-4 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(ref.current!);
        startTransition(async () => {
          action(fd);
        });
      }}
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <FasePicker fase={fase} productosDia={productosDia} periodoDias={periodoDias} mixto={mixto} errors={state.fieldErrors} />
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-ok">Fase actualizada. El paciente ya la ve en su app.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:text-ink">
          Cerrar
        </button>
        <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar fase"}
        </button>
      </div>
    </form>
  );
}
