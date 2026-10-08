"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, getSessionInfo } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CONSENT_DOCS, type ConsentKind } from "@/content/consentimientos";
import { consentHash } from "@/content/hash";
import { INTAKE_VERSION, datosPersonalesSchema, intakeSchema } from "@/content/cuestionario";
import { estadoValoracion } from "@/lib/valoracion";
import { PRECIO_VALORACION_CENTS, siteUrl, stripe } from "@/lib/stripe";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

async function requirePatient() {
  const s = await getSessionInfo();
  if (!s.userId || s.role !== "patient") throw new Error("Acceso no permitido");
  return s.userId;
}

/** Firma de consentimientos: un registro inmutable por documento, con versión y hash del texto. */
export async function firmarConsentimientos(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requirePatient();
  const h = await headers();
  const evidenceBase = {
    canal: "web",
    user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
  };

  const rows = [];
  for (const d of CONSENT_DOCS) {
    const granted = formData.get(d.kind) === "on";
    if (d.required && !granted) return { error: "Para continuar necesitamos que aceptes los dos documentos obligatorios." };
    rows.push({
      user_id: userId,
      kind: d.kind as ConsentKind,
      text_version: d.version,
      granted,
      evidence: { ...evidenceBase, sha256: consentHash(d) },
    });
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("consents").insert(rows);
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  revalidatePath("/paciente/valoracion");
  return { ok: true };
}

/** Guarda el cuestionario (borrador) o lo envía. Al enviarlo queda bloqueado para el paciente. */
export async function guardarCuestionario(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requirePatient();
  const enviar = formData.get("_accion") === "enviar";

  const raw: Record<string, unknown> = {
    ...Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$") && !k.startsWith("_") && k !== "antecedentes")),
    antecedentes: formData.getAll("antecedentes"),
  };

  const personal = datosPersonalesSchema.safeParse(raw);
  const intake = intakeSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};
  if (enviar) {
    for (const i of personal.error?.issues ?? []) fieldErrors[String(i.path[0])] ??= i.message;
    for (const i of intake.error?.issues ?? []) fieldErrors[String(i.path[0])] ??= i.message;
    if (Object.keys(fieldErrors).length) return { error: "Revisa los campos marcados.", fieldErrors };
  }

  const supabase = await createSupabaseServer();

  // Datos personales al perfil (solo las columnas que el paciente puede editar).
  const perfil: Record<string, string> = {};
  if (typeof raw.birth_date === "string" && raw.birth_date) perfil.birth_date = raw.birth_date;
  if (raw.sex === "mujer" || raw.sex === "hombre") perfil.sex = raw.sex;
  if (personal.success) Object.assign(perfil, personal.data);
  if (Object.keys(perfil).length) {
    const { error } = await supabase.from("profiles").update(perfil).eq("id", userId);
    if (error) return { error: "No se han podido guardar tus datos personales." };
  }

  // Borrador: guardamos lo que haya (sin validar del todo); envío: solo datos validados.
  const answers = intake.success ? intake.data : Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "birth_date" && k !== "sex"));
  const { data: existing } = await supabase.from("intake_forms").select("id, status").eq("patient_id", userId).maybeSingle();
  if (existing?.status === "enviado") return { error: "El cuestionario ya se envió." };

  const saved = existing
    ? await supabase.from("intake_forms").update({ answers, form_version: INTAKE_VERSION }).eq("patient_id", userId)
    : await supabase.from("intake_forms").insert({ patient_id: userId, answers, form_version: INTAKE_VERSION });
  if (saved.error) return { error: "No se ha podido guardar el cuestionario." };
  if (enviar) {
    const sent = await supabase.from("intake_forms").update({ status: "enviado" }).eq("patient_id", userId);
    if (sent.error) return { error: "No se ha podido enviar el cuestionario." };
  }

  revalidatePath("/paciente/valoracion");
  return { ok: true };
}

/** Inicia el pago de la valoración en Stripe Checkout. */
export async function iniciarPago(): Promise<void> {
  const userId = await requirePatient();
  const supabase = await createSupabaseServer();
  const estado = await estadoValoracion(supabase, userId);
  if (estado.paso !== "pago" && estado.paso !== "pendiente_pago") redirect("/paciente/valoracion");

  const admin = createSupabaseAdmin();
  const { data: authUser } = await supabase.auth.getUser();
  const { data: pago, error } = await admin
    .from("payments")
    .insert({ patient_id: userId, concept: "valoracion", amount_cents: PRECIO_VALORACION_CENTS })
    .select("id")
    .single();
  if (error || !pago) throw new Error("No se ha podido iniciar el pago");

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      locale: "es",
      currency: "eur",
      client_reference_id: pago.id,
      customer_email: authUser.user?.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: PRECIO_VALORACION_CENTS,
            product_data: {
              name: "Valoración médica NoBack",
              description: "Analítica metabólica, consulta médica y plan personalizado.",
            },
          },
        },
      ],
      metadata: { payment_id: pago.id, patient_id: userId, concept: "valoracion" },
      payment_intent_data: { metadata: { payment_id: pago.id, concept: "valoracion" } },
      success_url: `${siteUrl()}/paciente/valoracion?pago=ok`,
      cancel_url: `${siteUrl()}/paciente/valoracion?pago=cancelado`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    { idempotencyKey: `valoracion-${pago.id}` },
  );

  await admin.from("payments").update({ stripe_checkout_id: session.id }).eq("id", pago.id);
  if (!session.url) throw new Error("Stripe no devolvió la página de pago");
  redirect(session.url);
}
