import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { estadoValoracion, type Paso } from "@/lib/valoracion";

export const metadata: Metadata = { title: "Mi programa" };

const resumen: Record<Paso, { titulo: string; texto: string; cta?: string }> = {
  consentimientos: {
    titulo: "Empieza tu valoración",
    texto: "Son unos 10 minutos: aceptar las condiciones de la atención, un cuestionario de salud y el pago de la valoración.",
    cta: "Empezar",
  },
  cuestionario: {
    titulo: "Completa tu cuestionario de salud",
    texto: "Tu médico lo revisará antes de la consulta. Puedes guardarlo y seguir más tarde.",
    cta: "Continuar",
  },
  pago: { titulo: "Último paso: el pago de la valoración", texto: "Incluye la analítica, la consulta médica y tu plan.", cta: "Ir al pago" },
  pendiente_pago: { titulo: "Pago pendiente", texto: "Si no llegaste a completar el pago, puedes intentarlo de nuevo.", cta: "Completar el pago" },
  recibida: {
    titulo: "Valoración recibida",
    texto: "Hemos recibido tu cuestionario y tu pago. El equipo te contactará para la analítica y la consulta con tu médico.",
    cta: "Ver detalle",
  },
};

export default async function PacientePage() {
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const estado = await estadoValoracion(supabase, s.userId!);
  const r = resumen[estado.paso];

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Hola{estado.profile?.first_name ? `, ${estado.profile.first_name}` : ""}</h1>
      <p className="mt-1 text-ink-soft">Este es tu espacio en NoBack.</p>
      <Card className="mt-8">
        <h2 className="font-semibold">{r.titulo}</h2>
        <p className="mt-2 text-ink-soft">{r.texto}</p>
        {r.cta && (
          <Link
            href="/paciente/valoracion"
            className="mt-5 inline-flex rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90"
          >
            {r.cta}
          </Link>
        )}
      </Card>
    </>
  );
}
