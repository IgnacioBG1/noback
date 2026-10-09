import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, seedCast, type Cast, type TestDb } from "./helpers";

let db: TestDb;
let c: Cast;
let msgA: string;

beforeAll(async () => {
  db = await createTestDb();
  c = await seedCast(db.client);
  const r = await asService(
    db.client,
    `insert into public.messages (patient_id, channel, direction, sender, body) values ($1, 'whatsapp', 'in', 'patient', 'Tengo mareos desde ayer') returning id`,
    [c.patientA],
  );
  msgA = r.rows[0].id;
  await asService(db.client, `insert into public.escalations (patient_id, message_id, reason) values ($1, $2, 'clinico')`, [c.patientA, msgA]);
  await asService(db.client, `insert into public.checkins (patient_id, kind, value) values ($1, 'plan', 'si')`, [c.patientA]);
  await asService(db.client, `insert into public.patient_channels (patient_id, phone_enc, phone_hash, phone_last4) values ($1, 'cifrado', 'hash-a', '1234')`, [c.patientA]);
}, 60_000);
afterAll(async () => db?.drop());

describe("Mensajes", () => {
  it("son inmutables, también para el servidor", async () => {
    await expect(asService(db.client, `update public.messages set body = 'x'`)).rejects.toThrow(/inmutable/);
    await expect(asService(db.client, `delete from public.messages`)).rejects.toThrow(/inmutable/);
  });

  it("el paciente escribe en el chat web y lee lo suyo; no lo de otro paciente", async () => {
    const r = await asUser(db.client, c.patientA, "aal1", async (q) => {
      await q(`insert into public.messages (patient_id, channel, direction, sender, body) values ($1, 'web', 'in', 'patient', 'Hola')`, [c.patientA]);
      return (await q(`select body from public.messages`)).rows.length;
    });
    expect(r).toBe(2);
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) =>
        q(`insert into public.messages (patient_id, channel, direction, sender, body) values ($1, 'web', 'out', 'agent', 'falso')`, [c.patientA]),
      ),
    ).rejects.toThrow(/row-level security/);
    const b = await asUser(db.client, c.patientB, "aal1", async (q) => (await q(`select id from public.messages`)).rows.length);
    expect(b).toBe(0);
  });

  it("el médico lee la conversación con auditoría y responde; el entrenador no la ve", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const conv = (await q(`select body from public.get_conversation($1)`, [c.patientA])).rows;
      await q(`insert into public.messages (patient_id, channel, direction, sender, staff_id, body) values ($1, 'whatsapp', 'out', 'staff', $2, 'Te llamo ahora')`, [c.patientA, c.doctor]);
      await q("reset role");
      const log = (await q(`select action from public.access_log where actor_id = $1`, [c.doctor])).rows;
      return { conv, log };
    });
    expect(r.conv[0].body).toBe("Tengo mareos desde ayer");
    expect(r.log.map((x) => x.action)).toContain("ver_conversacion");
    const t = await asUser(db.client, c.trainer, "aal2", async (q) => ({
      m: (await q(`select id from public.messages`)).rows.length,
      ch: (await q(`select id from public.checkins`)).rows.length,
    }));
    expect(t).toEqual({ m: 0, ch: 1 });
  });
});

describe("Escalados", () => {
  it("el médico los lista y cierra; solo cambia el estado y queda quién y cuándo", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const l = (await q(`select body, first_name, status from public.list_escalations('abierta')`)).rows;
      await q(`update public.escalations set status = 'respondida' where message_id = $1`, [msgA]);
      const e = (await q(`select status, resolved_by, resolved_at from public.escalations where message_id = $1`, [msgA])).rows[0];
      return { l, e };
    });
    expect(r.l[0]).toMatchObject({ body: "Tengo mareos desde ayer", first_name: "Ana", status: "abierta" });
    expect(r.e.status).toBe("respondida");
    expect(r.e.resolved_by).toBe(c.doctor);
    expect(r.e.resolved_at).not.toBeNull();
    await expect(asUser(db.client, c.doctor, "aal2", (q) => q(`update public.escalations set reason = 'peticion'`))).rejects.toThrow(/permission denied/);
    await expect(asService(db.client, `delete from public.escalations`)).rejects.toThrow(/no se borran/);
  });

  it("sin doble factor, ni el entrenador ni el paciente ven la bandeja", async () => {
    await expect(asUser(db.client, c.doctor, "aal1", (q) => q(`select * from public.list_escalations()`))).rejects.toThrow(/doble factor/);
    const t = await asUser(db.client, c.trainer, "aal2", async (q) => (await q(`select * from public.list_escalations()`)).rows.length);
    expect(t).toBe(0);
    await expect(asUser(db.client, c.patientA, "aal1", (q) => q(`select * from public.list_escalations()`))).rejects.toThrow(/Solo para el equipo/);
  });
});

describe("Canal de WhatsApp", () => {
  it("el paciente ve sus ajustes pero no el teléfono cifrado ni su hash, y solo cambia los recordatorios", async () => {
    const r = await asUser(db.client, c.patientA, "aal1", async (q) => {
      const row = (await q(`select phone_last4, reminder_hour from public.patient_channels`)).rows[0];
      await q(`update public.patient_channels set reminder_hour = 20 where patient_id = $1`, [c.patientA]);
      return row;
    });
    expect(r).toEqual({ phone_last4: "1234", reminder_hour: 9 });
    await expect(asUser(db.client, c.patientA, "aal1", (q) => q(`select phone_enc from public.patient_channels`))).rejects.toThrow(/permission denied/);
    await expect(asUser(db.client, c.patientA, "aal1", (q) => q(`update public.patient_channels set phone_hash = 'x'`))).rejects.toThrow(/permission denied/);
    const d = await asUser(db.client, c.doctor, "aal2", async (q) => (await q(`select patient_id from public.patient_channels`)).rows.length);
    expect(d).toBe(0);
  });

  it("un check-in por tipo y día", async () => {
    await expect(asService(db.client, `insert into public.checkins (patient_id, kind, value) values ($1, 'plan', 'no')`, [c.patientA])).rejects.toThrow(/duplicate key/);
  });
});
