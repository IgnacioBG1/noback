import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Icon } from "@/components/ui";
import { getResumenPaciente } from "@/lib/paciente";
import { consentDoc } from "@/content/consentimientos";
import { SignForm } from "./sign-form";

export const metadata: Metadata = { title: "Consentimiento del tratamiento" };

export default async function ConsentimientoTratamiento() {
  const r = await getResumenPaciente();
  if (!r.consentimiento) redirect("/paciente/plan");
  const doc = consentDoc(r.consentimiento.kind);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/paciente/plan" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <Icon name="arrow" size={14} className="rotate-180" /> Mi plan
      </Link>
      <header>
        <p className="text-[13px] text-ink-soft">Versión {doc.version}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-ink-soft">Léelo con calma. Si tienes cualquier duda, pregúntala antes de firmar.</p>
      </header>
      <Card>
        <div className="space-y-3 text-[15px] leading-relaxed">
          {doc.body.map((p, i) => {
            const [t, ...rest] = p.split(": ");
            return rest.length && t.length < 60 ? (
              <p key={i}>
                <span className="font-semibold">{t}:</span> {rest.join(": ")}
              </p>
            ) : (
              <p key={i}>{p}</p>
            );
          })}
        </div>
      </Card>
      {r.consentimiento.firmado ? (
        <Card tone="default">
          <p className="flex items-center gap-2 text-sm font-medium text-ok">
            <Icon name="check" size={18} /> Ya lo firmaste. Puedes retirarlo cuando quieras avisando a tu médico.
          </p>
        </Card>
      ) : (
        <SignForm kind={doc.kind} version={doc.version} checkbox={doc.checkbox} />
      )}
    </div>
  );
}
