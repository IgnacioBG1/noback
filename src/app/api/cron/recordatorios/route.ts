import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { enviarRecordatorio } from "@/lib/agente/motor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Se llama cada hora (pg_cron de Supabase o Vercel Cron) con «Authorization: Bearer CRON_SECRET».
 * Envía el recordatorio a los pacientes con plan cuya hora elegida es la hora actual de Madrid. Idempotente por día.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const forzar = req.nextUrl.searchParams.get("hora");
  const objetivo = forzar ? Number(forzar) : hora;

  const db = createSupabaseAdmin();
  const [{ data: canales }, { data: activos }] = await Promise.all([
    db.from("patient_channels").select("patient_id, phone_hash, reminders_enabled, reminder_hour"),
    db.from("enrollments").select("patient_id").in("phase", ["activa", "mantenimiento"]).is("ended_on", null),
  ]);
  const ajustes = new Map((canales ?? []).map((c) => [c.patient_id, c]));
  let enviados = 0;
  for (const { patient_id } of activos ?? []) {
    // Sin ajustes guardados: chat web a las 9.
    const c = ajustes.get(patient_id) ?? { phone_hash: null, reminders_enabled: true, reminder_hour: 9 };
    if (!c.reminders_enabled || c.reminder_hour !== objetivo) continue;
    try {
      if (await enviarRecordatorio(patient_id, c.phone_hash ? "whatsapp" : "web")) enviados++;
    } catch (e) {
      console.error("recordatorio", patient_id, e);
    }
  }
  return NextResponse.json({ hora: objetivo, enviados });
}
