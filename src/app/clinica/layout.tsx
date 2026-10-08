import { redirect } from "next/navigation";
import { Logo, SignOutButton } from "@/components/ui";
import { ClinicNav } from "@/components/clinic-nav";
import { getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";
import { getPacientes, getPendientes, getStaff, ROLE_LABEL } from "@/lib/clinica";

export const dynamic = "force-dynamic";

export default async function ClinicaLayout({ children }: LayoutProps<"/clinica">) {
  const s = await getSessionInfo();
  const d = decideAccess("clinica", s, "/clinica");
  if (!d.allow) redirect(d.redirectTo);

  const [pendientes, pacientes, staff] = await Promise.all([getPendientes(), getPacientes(), getStaff()]);
  const items = [
    { href: "/clinica", label: "Hoy", icon: "home" },
    { href: "/clinica/pacientes", label: "Pacientes", icon: "users", count: pacientes.length },
    { href: "/clinica/valoraciones", label: "Valoraciones", icon: "clipboard", count: pendientes.length, alert: true },
    { href: "/clinica/mensajes", label: "Mensajes escalados", icon: "message", soon: true },
    { href: "/clinica/agenda", label: "Agenda", icon: "calendar", soon: true },
    { href: "/clinica/equipo", label: "Equipo", icon: "team", soon: true },
  ];
  const quien = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || "Tu cuenta";

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <div className="bg-side lg:w-64 lg:shrink-0">
      <aside className="text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-4 lg:py-6">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 lg:px-2 lg:pt-0 lg:pb-6">
          <Logo href="/clinica" sub="Clínica" dark />
          <div className="lg:hidden">
            <SignOutButton className="text-side-soft hover:bg-side-active hover:text-white" />
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <ClinicNav items={items} variant="top" />
        </div>
        <div className="hidden flex-1 lg:block">
          <ClinicNav items={items} variant="side" />
        </div>
        <div className="hidden border-t border-side-active pt-4 lg:block">
          <p className="px-3 text-sm text-white">{quien}</p>
          <p className="px-3 text-xs text-side-soft">{staff.role ? ROLE_LABEL[staff.role] : ""} · doble factor activo</p>
          <SignOutButton className="mt-2 w-full text-left text-side-soft hover:bg-side-active hover:text-white" />
        </div>
      </aside>
      </div>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
