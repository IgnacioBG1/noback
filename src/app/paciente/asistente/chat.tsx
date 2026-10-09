"use client";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { enviarAlAsistente, type ChatState } from "./actions";

export type Mensaje = {
  id: string;
  sender: "patient" | "agent" | "staff" | "system";
  kind: string;
  body: string | null;
  imagen: string | null;
  botones: { id: string; titulo: string }[] | null;
  hora: string;
  canal: string;
};

export function Chat({ mensajes }: { mensajes: Mensaje[] }) {
  const [state, action, pending] = useActionState<ChatState, FormData>(enviarAlAsistente, {});
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, pending]);
  // Las respuestas del equipo llegan sin que el paciente escriba: refrescamos cada 20 s.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  const mandar = (fd: FormData) => startTransition(() => action(fd));
  const ultimo = mensajes.at(-1);
  // Botones pendientes: los del último mensaje del asistente si el paciente no ha respondido después.
  const pendientes = [...mensajes].reverse().find((m) => m.sender !== "patient")?.botones;
  const mostrarBotones = pendientes && ultimo && ultimo.sender !== "patient";

  return (
    <div className="flex min-h-[60dvh] flex-col rounded-2xl border border-line bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {mensajes.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">Escríbeme lo que necesites sobre tu plan: qué te toca hoy, qué puedes comer, tus productos…</p>}
        {mensajes.map((m) => {
          const mio = m.sender === "patient";
          return (
            <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] ${mio ? "rounded-br-md bg-brand text-white" : m.sender === "staff" ? "rounded-bl-md border border-brand bg-brand-soft" : "rounded-bl-md bg-bg"}`}>
                {m.sender === "staff" && <p className="mb-0.5 text-xs font-semibold text-brand">Tu equipo médico</p>}
                {m.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imagen} alt="Foto de tu comida" className="mb-1.5 max-h-60 rounded-lg object-cover" />
                )}
                {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                <p className={`mt-1 text-[10px] ${mio ? "text-white/70" : "text-ink-soft"}`}>
                  {m.hora}
                  {m.canal === "whatsapp" ? " · WhatsApp" : ""}
                </p>
              </div>
            </div>
          );
        })}
        {pending && <p className="text-sm text-ink-soft">Escribiendo…</p>}
        <div ref={fin} />
      </div>

      {mostrarBotones && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {pendientes!.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("boton", b.id);
                fd.set("botonTitulo", b.titulo);
                mandar(fd);
              }}
              className="rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-50"
            >
              {b.titulo}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          const fd = new FormData();
          fd.set("texto", texto);
          setTexto("");
          mandar(fd);
        }}
      >
        <input
          ref={foto}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.set("foto", f);
            mandar(fd);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => foto.current?.click()} disabled={pending} className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink-soft hover:text-ink" aria-label="Enviar foto de una comida">
          <Icon name="camera" size={20} />
        </button>
        <label className="sr-only" htmlFor="texto">Mensaje</label>
        <textarea
          id="texto"
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escribe tu mensaje"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] outline-none focus:border-brand"
        />
        <button disabled={pending || !texto.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-40" aria-label="Enviar">
          <Icon name="arrow" size={20} />
        </button>
      </form>
      {state.error && <p role="alert" className="px-4 pb-3 text-sm text-danger">{state.error}</p>}
    </div>
  );
}
