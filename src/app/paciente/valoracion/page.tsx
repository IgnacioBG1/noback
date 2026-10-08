import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { estadoValoracion, type Paso } from "@/lib/valoracion";
import { CONSENT_DOCS } from "@/content/consentimientos";
import { PRECIO_VALORACION_CENTS, eur } from "@/lib/stripe";
import { ConsentStep } from "./consent-step";
import { IntakeForm } from "./intake-form";
import { iniciarPago } from "./actions";

export const metadata: Metadata = { title: "Valoración" };

const PASOS: { key: Paso[]; label: string }[] = [
  { key: ["consentimientos"], label: "Condiciones" },
  { key: ["cuestionario"], label: "Cuestionario" },
  { key: ["pago", "pendiente_pago"], label: "Pago" },
  { key: ["recibida"], label: "Listo" },
];

export default async function ValoracionPage({ searchParams }: PageProps<"/paciente/valoracion">) {
  const sp = await searchParams;
  const s = await getSessionInfo();
  const supabase = await createSupabaseServer();
  const estado = await estadoValoracion(supabase, s.userId!);
  const actual = PASOS.findIndex((p) => p.key.includes(estado.paso));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Tu valoración</h1>
      <ol className="mt-6 grid grid-cols-4 gap-2 text-xs sm:text-sm" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p.label} aria-current={i === actual ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${i <= actual ? "bg-brand" : "bg-line"}`} />
            <span className={`mt-2 block ${i === actual ? "font-medium text-ink" : "text-ink-soft"}`}>{p.label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {estado.paso === "consentimientos" && <ConsentStep docs={CONSENT_DOCS} />}

        {estado.paso === "cuestionario" && (
          <IntakeForm
            initial={{
              ...(estado.intake?.answers ?? {}),
              birth_date: estado.profile?.birth_date ?? "",
              sex: estado.profile?.sex ?? "",
            }}
          />
        )}

        {(estado.paso === "pago" || estado.paso === "pendiente_pago") && (
          <Card>
            {sp.pago === "ok" ? (
              <>
                <h2 className="font-semibold">Estamos confirmando tu pago</h2>
                <p className="mt-2 text-ink-soft">Suele tardar unos segundos. Recarga la página en un momento.</p>
              </>
            ) : (
              <>
                <h2 className="font-semibold">Pago de la valoración</h2>
                {sp.pago === "cancelado" && <p className="mt-2 text-sm text-danger">El pago no se completó. Puedes intentarlo de nuevo.</p>}
                <ul className="mt-4 space-y-2 text-ink-soft">
                  <li>· Analítica metabólica con los marcadores de edad biológica.</li>
                  <li>· Consulta médica para valorar tu caso y decidir contigo el plan.</li>
                  <li>· Medición inicial de composición corporal y fuerza.</li>
                </ul>
                <p className="mt-6 text-3xl font-semibold">{eur(PRECIO_VALORACION_CENTS)}</p>
                <p className="text-sm text-ink-soft">Pago único.</p>
                <form action={iniciarPago} className="mt-6">
                  <button className="inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
                    Pagar con tarjeta
                  </button>
                </form>
                <p className="mt-3 text-xs text-ink-soft">El pago se hace en la página segura de Stripe. No guardamos los datos de tu tarjeta.</p>
              </>
            )}
          </Card>
        )}

        {estado.paso === "recibida" && (
          <Card>
            <h2 className="font-semibold">Valoración recibida</h2>
            <p className="mt-2 text-ink-soft">
              Hemos recibido tu cuestionario y tu pago. El equipo te contactará para organizar la analítica y la consulta con tu
              médico.
            </p>
            <p className="mt-4 text-sm text-ink-soft">
              Si mientras tanto notas cualquier problema de salud urgente, llama al 112.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
