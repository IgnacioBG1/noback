import { redirect } from "next/navigation";
import Link from "next/link";
import { Shell, SignOutButton } from "@/components/ui";
import { getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function PacienteLayout({ children }: LayoutProps<"/paciente">) {
  const s = await getSessionInfo();
  const d = decideAccess("paciente", s, "/paciente");
  if (!d.allow) redirect(d.redirectTo);
  return (
    <Shell
      right={
        <>
          <Link href="/paciente" className="rounded-md px-3 py-1.5 text-ink-soft hover:bg-brand-soft hover:text-ink">
            Mi programa
          </Link>
          <SignOutButton />
        </>
      }
    >
      {children}
    </Shell>
  );
}
