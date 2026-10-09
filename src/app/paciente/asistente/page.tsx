import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Chat, type Mensaje } from "./chat";
import { ActivarWhatsApp, Recordatorios } from "./ajustes";

export const metadata: Metadata = { title: "Asistente" };

export default async function AsistentePage() {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const [{ data: msgs }, { data: canal }] = await Promise.all([
    supabase.from("messages").select("id, sender, kind, body, media_path, meta, created_at, channel").eq("patient_id", s.userId!).order("created_at", { ascending: false }).limit(80),
    supabase.from("patient_channels").select("phone_last4, whatsapp_opt_in_at, reminders_enabled, reminder_hour").eq("patient_id", s.userId!).maybeSingle(),
  ]);
  const lista = (msgs ?? []).reverse().filter((m) => !(m.sender === "system" && (m.meta as { vinculado?: boolean })?.vinculado));
  // Fotos propias: URL firmada temporal (el bucket es privado).
  const rutas = lista.filter((m) => m.media_path).map((m) => m.media_path!);
  const firmadas = rutas.length ? (await createSupabaseAdmin().storage.from("comidas").createSignedUrls(rutas, 600)).data ?? [] : [];
  const url = new Map(firmadas.map((f) => [f.path, f.signedUrl]));
  const hora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const mensajes: Mensaje[] = lista.map((m) => ({
    id: m.id,
    sender: m.sender,
    kind: m.kind,
    body: m.body,
    imagen: m.media_path ? url.get(m.media_path) ?? null : null,
    botones: ((m.meta as { botones?: Mensaje["botones"] })?.botones as Mensaje["botones"]) ?? null,
    hora: hora.format(new Date(m.created_at)),
    canal: m.channel,
  }));

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[13px] text-ink-soft">Asistente</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Pregúntame lo que necesites</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Soy un asistente automático. Te ayudo con tu plan y tus productos; lo que tenga que ver con tu salud se lo paso a tu médico.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Chat mensajes={mensajes} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitle>WhatsApp</CardTitle>
            <ActivarWhatsApp vinculado={!!canal?.whatsapp_opt_in_at} last4={canal?.phone_last4 ?? null} />
          </Card>
          <Card>
            <CardTitle>Recordatorios</CardTitle>
            <Recordatorios hora={canal?.reminder_hour ?? 9} activos={canal?.reminders_enabled ?? true} />
            <p className="mt-3 text-xs text-ink-soft">Cada día te recuerdo tu fase y te hago una pregunta rápida. Respondes con un toque.</p>
          </Card>
          <p className="px-1 text-xs text-ink-soft">Si es urgente o te encuentras muy mal, llama al 112. Este chat no es para urgencias.</p>
        </div>
      </div>
    </div>
  );
}
