import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, PageHeader, fmtFecha, nombreCompleto } from "@/components/ui";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ahoraMadridLocal } from "@/content/consulta";
import type { Historia } from "@/lib/historia";
import { ConsultaForm } from "./form";

export const metadata: Metadata = { title: "Nueva consulta" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConsultaPage({ params, searchParams }: PageProps<"/clinica/pacientes/[id]/consulta">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServer();
  const [{ data: card }, { data: rec }] = await Promise.all([
    supabase.rpc("get_patient_card", { p_patient: id }),
    supabase.rpc("get_clinical_record", { p_patient: id }),
  ]);
  const p = card?.[0];
  if (!p || !rec) notFound();
  const h = rec as Historia;
  const corrigeId = typeof sp.corrige === "string" && UUID.test(sp.corrige) ? sp.corrige : undefined;
  const corrigeEnc = corrigeId ? h.encounters.find((e) => e.id === corrigeId) : undefined;

  return (
    <>
      <Link href={`/clinica/pacientes/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <Icon name="arrow" size={14} className="rotate-180" /> {nombreCompleto(p)}
      </Link>
      <PageHeader title={corrigeEnc ? "Corregir nota" : h.encounters.length ? "Consulta de seguimiento" : "Consulta de valoración"}>
        {nombreCompleto(p)} · {h.encounters.length} consulta{h.encounters.length === 1 ? "" : "s"} previa{h.encounters.length === 1 ? "" : "s"}
      </PageHeader>
      <ConsultaForm
        patientId={id}
        ahora={ahoraMadridLocal()}
        primera={h.encounters.length === 0}
        planActual={h.plans[0] ?? null}
        corrige={corrigeEnc ? { id: corrigeEnc.id, fecha: fmtFecha(corrigeEnc.occurred_at) } : undefined}
      />
    </>
  );
}
