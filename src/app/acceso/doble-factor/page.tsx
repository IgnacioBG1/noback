import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Logo } from "@/components/ui";
import { getSessionInfo } from "@/lib/supabase/server";
import { decideAccess } from "@/lib/access";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Doble factor" };

export default async function DobleFactorPage() {
  const s = await getSessionInfo();
  const d = decideAccess("mfa", s, "/acceso/doble-factor");
  if (!d.allow) redirect(d.redirectTo);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <h1 className="text-xl font-semibold">{s.hasVerifiedFactor ? "Introduce tu código" : "Activa el doble factor"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {s.hasVerifiedFactor
              ? "Abre tu app de autenticación y escribe el código de 6 cifras."
              : "Es obligatorio para el equipo clínico. Escanea el código con una app de autenticación (Google Authenticator, 1Password, Authy…) y escribe el código de 6 cifras."}
          </p>
          <MfaForm mode={s.hasVerifiedFactor ? "verify" : "enroll"} />
        </Card>
      </div>
    </div>
  );
}
