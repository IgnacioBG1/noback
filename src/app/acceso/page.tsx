import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Logo } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getSessionInfo } from "@/lib/supabase/server";
import { isStaffRole, safeNext } from "@/lib/access";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acceso" };

export default async function AccesoPage({ searchParams }: PageProps<"/acceso">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "");

  if (isSupabaseConfigured()) {
    const s = await getSessionInfo();
    if (s.userId) redirect(next || (isStaffRole(s.role) ? "/clinica" : "/paciente"));
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <h1 className="text-xl font-semibold">Accede a tu cuenta</h1>
          <p className="mt-1 text-sm text-ink-soft">Pacientes y equipo clínico.</p>
          {isSupabaseConfigured() ? (
            <LoginForm next={next} />
          ) : (
            <p className="mt-6 rounded-md bg-brand-soft p-3 text-sm">El acceso aún no está activado en este entorno.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
