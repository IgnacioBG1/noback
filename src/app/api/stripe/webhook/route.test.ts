import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

// Base de datos simulada: registra las operaciones del webhook.
const calls: { table: string; op: string; payload?: unknown; filters: [string, unknown][] }[] = [];
let openEnrollments: unknown[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdmin: () => ({
    from(table: string) {
      const call = { table, op: "", payload: undefined as unknown, filters: [] as [string, unknown][] };
      calls.push(call);
      const q: Record<string, unknown> = {
        update(p: unknown) { call.op = "update"; call.payload = p; return q; },
        insert(p: unknown) { call.op = "insert"; call.payload = p; return Promise.resolve({ error: null }); },
        select() { if (!call.op) call.op = "select"; return q; },
        eq(k: string, v: unknown) { call.filters.push([k, v]); return q; },
        neq(k: string, v: unknown) { call.filters.push([`!${k}`, v]); return q; },
        is(k: string, v: unknown) { call.filters.push([k, v]); return q; },
        limit() { return Promise.resolve({ data: openEnrollments, error: null }); },
        maybeSingle() { return Promise.resolve({ data: { patient_id: "pac-1", concept: "valoracion" }, error: null }); },
        then(res: (v: unknown) => void) { res({ error: null }); },
      };
      return q;
    },
  }),
}));

const SECRET = "whsec_test_secreto";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const { POST } = await import("./route");

function signed(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("https://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}
const completed = (payment_status = "paid") => ({
  id: "evt_1",
  type: "checkout.session.completed",
  created: 1791470000,
  data: { object: { id: "cs_1", payment_status, metadata: { payment_id: "pay-1" }, client_reference_id: "pay-1", payment_intent: "pi_1" } },
});

beforeEach(() => {
  calls.length = 0;
  openEnrollments = [];
});

describe("Webhook de Stripe", () => {
  it("rechaza peticiones sin firma o con firma falsa", async () => {
    const sinFirma = await POST(new Request("https://x", { method: "POST", body: "{}" }) as never);
    expect(sinFirma.status).toBe(400);
    const falsa = await POST(signed(completed(), "whsec_otro") as never);
    expect(falsa.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("pago completado: marca pagado (solo si no lo estaba) y abre la inscripción en valoración", async () => {
    const r = await POST(signed(completed()) as never);
    expect(r.status).toBe(200);
    const upd = calls.find((c) => c.table === "payments")!;
    expect(upd.op).toBe("update");
    expect(upd.payload).toMatchObject({ status: "pagado", stripe_payment_intent: "pi_1" });
    expect(upd.filters).toEqual([["id", "pay-1"], ["!status", "pagado"]]);
    const ins = calls.find((c) => c.table === "enrollments" && c.op === "insert")!;
    expect(ins.payload).toEqual({ patient_id: "pac-1", phase: "valoracion" });
  });

  it("no duplica la inscripción si ya hay una abierta", async () => {
    openEnrollments = [{ id: "e1" }];
    await POST(signed(completed()) as never);
    expect(calls.some((c) => c.table === "enrollments" && c.op === "insert")).toBe(false);
  });

  it("un pago aún no cobrado (diferido) no se marca", async () => {
    await POST(signed(completed("unpaid")) as never);
    expect(calls).toHaveLength(0);
  });

  it("sesión caducada: marca fallido solo si estaba pendiente", async () => {
    await POST(signed({ ...completed(), type: "checkout.session.expired" }) as never);
    const upd = calls.find((c) => c.table === "payments")!;
    expect(upd.payload).toEqual({ status: "fallido" });
    expect(upd.filters).toEqual([["id", "pay-1"], ["status", "pendiente"]]);
  });
});
