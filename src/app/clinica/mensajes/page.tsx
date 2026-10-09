import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, Icon, PageHeader, fmtFecha, nombreCompleto } from "@/components/ui";
import { Avatar } from "@/components/clinic-tables";
import { getEscalados, REASON_LABEL } from "@/lib/mensajes";
import { ReplyForm } from "./reply-form";
import { cerrarEscalado } from "./actions";

export const metadata: Metadata = { title: "Mensajes escalados" };

export default async function MensajesPage({ searchParams }: PageProps<"/clinica/mensajes">) {
  const sp = await searchParams;
  const ver = sp.ver === "todas" ? "todas" : "abierta";
  const items = await getEscalados(ver);

  return (
    <>
      <PageHeader title="Mensajes escalados">
        Lo que el asistente no responde por sí mismo: todo lo que tiene que ver con la salud del paciente, peticiones y preguntas que no sabe contestar. El texto es literal.
      </PageHeader>
      <div className="flex gap-2">
        {[
          ["abierta", "Pendientes"],
          ["todas", "Todos"],
        ].map(([k, l]) => (
          <Link key={k} href={`/clinica/mensajes${k === "todas" ? "?ver=todas" : ""}`} aria-current={ver === k ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${ver === k ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft"}`}>
            {l}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Icon name="check" />} title={ver === "abierta" ? "No hay mensajes pendientes" : "Todavía no hay mensajes escalados"}>
            Cuando un paciente escriba algo que deba ver el equipo, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id}>
              <Card tone={e.status === "abierta" && (e.reason === "clinico" || e.reason === "malestar") ? "warn" : "default"}>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar p={e} tone={e.status === "abierta" ? "warn" : "default"} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/clinica/pacientes/${e.patient_id}#conversacion`} className="font-medium hover:text-brand">
                      {nombreCompleto(e)}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {fmtFecha(e.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.channel === "whatsapp" ? "WhatsApp" : "Chat de la app"}
                    </p>
                  </div>
                  <Badge tone={e.reason === "clinico" || e.reason === "malestar" ? "warn" : "default"}>{REASON_LABEL[e.reason]}</Badge>
                  {e.status !== "abierta" && <Badge tone="ok">{e.status === "respondida" ? "Respondido" : "Cerrado"}</Badge>}
                </div>
                <blockquote className="mt-3 rounded-lg bg-surface px-4 py-3 text-[15px] whitespace-pre-line shadow-[inset_3px_0_0_var(--line)]">
                  {e.kind === "image" ? "[Foto] " : ""}{e.body ?? (e.kind === "button" ? "(respuesta con botón)" : "")}
                </blockquote>
                {e.status === "abierta" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <ReplyForm patientId={e.patient_id} escalationId={e.id} compact />
                    <form action={cerrarEscalado}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:text-ink">Cerrar sin responder</button>
                    </form>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-soft">El asistente nunca valora la urgencia: al paciente siempre le recuerda llamar al 112 si es urgente. Cada acceso queda registrado.</p>
    </>
  );
}
