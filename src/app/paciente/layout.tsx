import { redirect } from "next/navigation";
import { Logo, SignOutButton } from "@/components/ui";
import { PatientBottomNav, PatientTopNav } from "@/components/patient-nav";
import { getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function PacienteLayout({ children }: LayoutProps<"/paciente">) {
  const s = await getSessionInfo();
  const d = decideAccess("paciente", s, "/paciente");
  if (!d.allow) redirect(d.redirectTo);
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Logo href="/paciente" />
          <PatientTopNav />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:pt-8 md:pb-12">{children}</main>
      <PatientBottomNav />
    </div>
  );
}
