import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Webhook de Stripe. Verifica la firma, marca el pago y abre la inscripción en fase de valoración.
 * Es idempotente: Stripe puede reenviar el mismo evento.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "sin firma" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "firma no válida" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid") break; // pagos diferidos: esperamos a async_payment_succeeded
      const paymentId = session.metadata?.payment_id ?? session.client_reference_id;
      if (!paymentId) break;

      const { data: pago, error } = await admin
        .from("payments")
        .update({
          status: "pagado",
          paid_at: new Date((event.created ?? Date.now() / 1000) * 1000).toISOString(),
          stripe_checkout_id: session.id,
          stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        })
        .eq("id", paymentId)
        .neq("status", "pagado")
        .select("patient_id, concept")
        .maybeSingle();
      if (error) return NextResponse.json({ error: "no se pudo registrar el pago" }, { status: 500 }); // Stripe reintentará

      if (pago?.concept === "valoracion") {
        const { data: abierta } = await admin
          .from("enrollments")
          .select("id")
          .eq("patient_id", pago.patient_id)
          .is("ended_on", null)
          .limit(1);
        if (!abierta?.length) {
          const { error: e2 } = await admin.from("enrollments").insert({ patient_id: pago.patient_id, phase: "valoracion" });
          if (e2) return NextResponse.json({ error: "no se pudo abrir la inscripción" }, { status: 500 });
        }
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const paymentId = session.metadata?.payment_id ?? session.client_reference_id;
      if (paymentId) await admin.from("payments").update({ status: "fallido" }).eq("id", paymentId).eq("status", "pendiente");
      break;
    }
  }
  return NextResponse.json({ received: true });
}
