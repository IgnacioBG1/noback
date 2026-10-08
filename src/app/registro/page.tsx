import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  const abierto = isSupabaseConfigured() && process.env.REGISTRO_ABIERTO === "true";
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <h1 className="text-xl font-semibold">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-ink-soft">Es el primer paso de tu valoración. Solo para mayores de 18 años.</p>
          {abierto ? (
            <SignupForm />
          ) : (
            <p className="mt-6 rounded-md bg-brand-soft p-3 text-sm">
              Las altas abrirán próximamente. Si eres paciente del programa piloto, el equipo te enviará una invitación.
            </p>
          )}
          <p className="mt-6 text-center text-sm text-ink-soft">
            ¿Ya tienes cuenta?{" "}
            <Link href="/acceso" className="font-medium text-brand hover:underline">
              Accede
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
