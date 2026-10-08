import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clínica" };

const phaseLabel: Record<string, string> = {
  valoracion: "Valoración",
  activa: "Fase activa",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};
const routeLabel: Record<string, string> = { farmaco: "Ruta fármaco", sin_farmaco: "Ruta sin fármaco" };

export default async function ClinicaPage() {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();

  // RLS devuelve solo los pacientes asignados a este profesional (o todos, si es admin).
  const { data: team } = await supabase
    .from("care_team")
    .select("patient_id, staff_role")
    .eq("staff_id", s.userId!)
    .is("until", null);
  const patientIds = (team ?? []).map((t) => t.patient_id);

  const [{ data: patients }, { data: enrollments }] = await Promise.all([
    patientIds.length
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", patientIds).order("last_name")
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null }[] }),
    patientIds.length
      ? supabase.from("enrollments").select("patient_id, phase, route, started_on").in("patient_id", patientIds).order("started_on", { ascending: false })
      : Promise.resolve({ data: [] as { patient_id: string; phase: string; route: string | null; started_on: string }[] }),
  ]);
  const latest = new Map<string, { phase: string; route: string | null }>();
  for (const e of enrollments ?? []) if (!latest.has(e.patient_id)) latest.set(e.patient_id, e);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis pacientes</h1>
        <p className="mt-1 text-ink-soft">
          {patientIds.length === 0 ? "Aún no tienes pacientes asignados." : `${patientIds.length} paciente${patientIds.length === 1 ? "" : "s"} asignado${patientIds.length === 1 ? "" : "s"}.`}
        </p>
      </div>
      {patients && patients.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {patients.map((p) => {
              const e = latest.get(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between px-6 py-4">
                  <span className="font-medium">
                    {[p.first_name, p.last_name].filter(Boolean).join(" ") || "Paciente sin nombre"}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {e ? [phaseLabel[e.phase], e.route ? routeLabel[e.route] : null].filter(Boolean).join(" · ") : "Sin inscripción"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <p className="text-xs text-ink-soft">
        Cada acceso a la ficha de un paciente queda registrado en la auditoría.
      </p>
    </div>
  );
}
