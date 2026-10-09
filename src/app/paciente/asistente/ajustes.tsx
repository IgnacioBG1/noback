"use client";
import { useActionState, useState, useTransition } from "react";
import { activarWhatsApp, guardarRecordatorios, type VincularState } from "./actions";

export function ActivarWhatsApp({ vinculado, last4 }: { vinculado: boolean; last4: string | null }) {
  const [res, setRes] = useState<VincularState | null>(null);
  const [pending, start] = useTransition();
  if (vinculado)
    return (
      <p className="text-sm">
        <span className="font-medium text-ok">WhatsApp activado</span> en el número acabado en <span className="num">{last4}</span>. Escríbeme por allí cuando quieras.
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Recibe tus recordatorios y habla con el asistente desde tu WhatsApp. Es un toque: se abre WhatsApp con un mensaje preparado y solo tienes que enviarlo.</p>
      {res?.enlace ? (
        <a href={res.enlace} className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white">
          Abrir WhatsApp y enviar
        </a>
      ) : res?.codigo ? (
        <p className="rounded-lg bg-bg px-3 py-2 text-sm">
          Envía este código a nuestro WhatsApp: <strong className="num tracking-widest">{res.codigo}</strong> (válido 30 minutos).
        </p>
      ) : (
        <button type="button" disabled={pending} onClick={() => start(async () => setRes(await activarWhatsApp()))} className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Preparando…" : "Activar WhatsApp"}
        </button>
      )}
      {res?.error && <p className="text-sm text-ink-soft">{res.error}</p>}
    </div>
  );
}

export function Recordatorios({ hora, activos }: { hora: number; activos: boolean }) {
  const [state, action, pending] = useActionState(guardarRecordatorios, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" name="activos" defaultChecked={activos} className="size-4 accent-[var(--brand)]" />
        Recordatorio diario a las
      </label>
      <select name="hora" defaultValue={hora} className="rounded-lg border border-line bg-surface px-2 py-1.5">
        {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
      <button disabled={pending} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-bg">
        Guardar
      </button>
      {state.ok && <span className="text-ok">Guardado</span>}
      {state.error && <span className="text-danger">{state.error}</span>}
    </form>
  );
}
