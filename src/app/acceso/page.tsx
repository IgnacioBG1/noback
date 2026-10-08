import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Logo } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getSessionInfo } from "@/lib/supabase/server";
import { isStaffRole, safeNext } from "@/lib/access";
import { LoginForm } from "./login-form";
import { OtpLogin } from "@/components/otp-login";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acceso" };

export default async function AccesoPage({ searchParams }: PageProps<"/acceso">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "");
  const conClave = sp.clave === "1";

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
          <h1 className="text-xl font-semibold">{conClave ? "Acceso con contraseña" : "Entra en NoBack"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{conClave ? "Para el equipo clínico." : "Escribe tu correo y te enviamos un código."}</p>
          {sp.error === "enlace" && (
            <p role="alert" className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">
              El enlace ha caducado o ya se usó. Pide un código nuevo.
            </p>
          )}
          {isSupabaseConfigured() ? (
            conClave ? <LoginForm next={next} /> : <OtpLogin next={next || "/paciente"} />
          ) : (
            <p className="mt-6 rounded-md bg-brand-soft p-3 text-sm">El acceso aún no está activado en este entorno.</p>
          )}
        </Card>
        <p className="mt-4 text-center text-sm text-ink-soft">
          {conClave ? (
            <Link href={`/acceso${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="hover:text-ink">
              Entrar con un código por correo
            </Link>
          ) : (
            <Link href={`/acceso?clave=1${next ? `&next=${encodeURIComponent(next)}` : ""}`} className="hover:text-ink">
              ¿Eres del equipo? Entrar con contraseña
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
