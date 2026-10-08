import type { Metadata } from "next";
import Link from "next/link";
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
const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(new Date(iso)) : "—";
const nombre = (p: { first_name: string | null; last_name: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || "Paciente sin nombre";

export default async function ClinicaPage() {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();

  // Cola de valoraciones pagadas pendientes de consulta (admin: todas; médico: las de sus pacientes). Queda auditado.
  const { data: pendientes } = await supabase.rpc("list_pending_assessments");

  // Pacientes asignados a este profesional (RLS).
  const { data: team } = await supabase.from("care_team").select("patient_id").eq("staff_id", s.userId!).is("until", null);
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
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Valoraciones pendientes</h1>
          <p className="mt-1 text-ink-soft">Cuestionario enviado y valoración pagada, a la espera de consulta.</p>
        </div>
        {pendientes && pendientes.length > 0 ? (
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-soft">
                <tr className="border-b border-line">
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Cuestionario</th>
                  <th className="px-6 py-3 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pendientes.map((p: { patient_id: string; first_name: string | null; last_name: string | null; submitted_at: string | null; paid_at: string | null }) => (
                  <tr key={p.patient_id}>
                    <td className="px-6 py-3">
                      <Link href={`/clinica/pacientes/${p.patient_id}`} className="font-medium text-brand hover:underline">
                        {nombre(p)}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-ink-soft">{fecha(p.submitted_at)}</td>
                    <td className="px-6 py-3 text-ink-soft">{fecha(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <p className="text-ink-soft">No hay valoraciones pendientes.</p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mis pacientes</h2>
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
                    <Link href={`/clinica/pacientes/${p.id}`} className="font-medium text-brand hover:underline">
                      {nombre(p)}
                    </Link>
                    <span className="text-sm text-ink-soft">
                      {e ? [phaseLabel[e.phase], e.route ? routeLabel[e.route] : null].filter(Boolean).join(" · ") : "Sin inscripción"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <p className="text-xs text-ink-soft">Cada acceso a la ficha de un paciente queda registrado en la auditoría.</p>
    </div>
  );
}
