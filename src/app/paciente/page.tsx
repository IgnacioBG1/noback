import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Shell, SignOutButton } from "@/components/ui";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";

export const metadata: Metadata = { title: "Mi programa" };
export const dynamic = "force-dynamic";

export default async function PacientePage() {
  const s = await getSessionInfo();
  const d = decideAccess("paciente", s, "/paciente");
  if (!d.allow) redirect(d.redirectTo);

  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", s.userId!).maybeSingle();

  return (
    <Shell right={<SignOutButton />}>
      <h1 className="text-2xl font-semibold tracking-tight">Hola{profile?.first_name ? `, ${profile.first_name}` : ""}</h1>
      <p className="mt-1 text-ink-soft">Este es tu espacio en NoBack.</p>
      <Card className="mt-8">
        <h2 className="font-semibold">Tu programa está en preparación</h2>
        <p className="mt-2 text-ink-soft">
          Aquí verás tu plan, tus analíticas, tu composición corporal, tu fuerza y tu edad biológica. Tu equipo te avisará
          cuando esté listo.
        </p>
      </Card>
    </Shell>
  );
}
