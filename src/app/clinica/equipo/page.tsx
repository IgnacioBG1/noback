import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card, CardTitle, EmptyState, Icon, PageHeader, nombreCompleto } from "@/components/ui";
import { Avatar, EstadoBadge } from "@/components/clinic-tables";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPacientes, getStaff, ROLE_LABEL } from "@/lib/clinica";
import { AssignForm } from "./assign-form";

export const metadata: Metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const staff = await getStaff();
  if (staff.role !== "admin") notFound();
  const supabase = await createSupabaseServer();
  const hoy = new Date().toISOString().slice(0, 10);
  const [pacientes, { data: profesionales }, { data: equipo }] = await Promise.all([
    getPacientes(),
    supabase.from("profiles").select("id, first_name, last_name, role").neq("role", "patient").order("role"),
    supabase.from("care_team").select("patient_id, staff_id, staff_role").or(`until.is.null,until.gte.${hoy}`),
  ]);
  const pros = (profesionales ?? []).map((p) => ({ id: p.id, name: nombreCompleto(p), role: p.role as string }));
  const doctors = pros.filter((p) => p.role === "doctor" || p.role === "admin");
  const trainers = pros.filter((p) => p.role === "trainer" || p.role === "admin");
  const carga = (id: string) => (equipo ?? []).filter((e) => e.staff_id === id).length;
  const de = (pid: string, role: string) => (equipo ?? []).find((e) => e.patient_id === pid && e.staff_role === role)?.staff_id ?? "";

  return (
    <>
      <PageHeader title="Equipo">Quién atiende a cada paciente. Cada profesional solo ve a los pacientes que tiene asignados.</PageHeader>

      <Card>
        <CardTitle aside={`${pros.length} personas`}>Profesionales</CardTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <Avatar p={{ first_name: p.name.split(" ")[0], last_name: p.name.split(" ")[1] ?? null }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-ink-soft">{ROLE_LABEL[p.role]}</p>
              </div>
              <Badge>{carga(p.id)} pac.</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">Las cuentas de profesionales las crea el administrador técnico, con su rol y el doble factor obligatorio.</p>
      </Card>

      <Card>
        <CardTitle>Asignaciones</CardTitle>
        {pacientes.length ? (
          <ul className="divide-y divide-line">
            {pacientes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar p={p} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{nombreCompleto(p)}</p>
                  <EstadoBadge phase={p.phase} />
                </div>
                <AssignForm patientId={p.id} doctors={doctors} trainers={trainers} doctor={de(p.id, "doctor")} trainer={de(p.id, "trainer")} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Icon name="users" />} title="Aún no hay pacientes" />
        )}
      </Card>
    </>
  );
}
