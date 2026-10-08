import { redirect } from "next/navigation";
import { Shell, SignOutButton } from "@/components/ui";
import { getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function ClinicaLayout({ children }: LayoutProps<"/clinica">) {
  const s = await getSessionInfo();
  const d = decideAccess("clinica", s, "/clinica");
  if (!d.allow) redirect(d.redirectTo);
  return (
    <Shell
      right={
        <>
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">Equipo clínico</span>
          <SignOutButton />
        </>
      }
    >
      {children}
    </Shell>
  );
}
