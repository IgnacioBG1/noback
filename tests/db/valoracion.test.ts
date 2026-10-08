import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, seedCast, type Cast, type TestDb } from "./helpers";

let db: TestDb;
let c: Cast;

beforeAll(async () => {
  db = await createTestDb();
  c = await seedCast(db.client);
}, 60_000);
afterAll(async () => db?.drop());

describe("Alta de usuario", () => {
  it("el perfil toma nombre y apellidos del registro y nace como paciente", async () => {
    const r = await db.client.query(
      `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'alta@test.invalid', '{"first_name":"  Lucía ","last_name":"Prueba","role":"admin"}') returning id`,
    );
    const p = await db.client.query(`select role, first_name, last_name from public.profiles where id = $1`, [r.rows[0].id]);
    expect(p.rows[0]).toEqual({ role: "patient", first_name: "Lucía", last_name: "Prueba" });
  });
});

describe("Cuestionario de acogida", () => {
  it("el paciente crea y edita su borrador", async () => {
    await asUser(db.client, c.patientA, "aal1", async (q) => {
      await q(`insert into public.intake_forms (patient_id, answers, form_version) values ($1, '{"peso":90}', 'v1')`, [c.patientA]);
      const u = await q(`update public.intake_forms set answers = '{"peso":89}' where patient_id = $1`, [c.patientA]);
      expect(u.rowCount).toBe(1);
    });
  });

  it("no puede crear el cuestionario de otro paciente", async () => {
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) =>
        q(`insert into public.intake_forms (patient_id, form_version) values ($1, 'v1')`, [c.patientB]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("al enviarlo se fecha y queda bloqueado para el paciente", async () => {
    await asService(db.client, `insert into public.intake_forms (patient_id, answers, form_version) values ($1, '{}', 'v1')`, [c.patientA]);
    const sent = await asUser(db.client, c.patientA, "aal1", async (q) => {
      await q(`update public.intake_forms set status = 'enviado' where patient_id = $1`, [c.patientA]);
      return (await q(`select status, submitted_at from public.intake_forms where patient_id = $1`, [c.patientA])).rows[0];
    });
    expect(sent.status).toBe("enviado");
    expect(sent.submitted_at).not.toBeNull();

    await asService(db.client, `update public.intake_forms set status = 'enviado' where patient_id = $1`, [c.patientA]);
    const n = await asUser(db.client, c.patientA, "aal1", async (q) =>
      (await q(`update public.intake_forms set answers = '{"x":1}' where patient_id = $1`, [c.patientA])).rowCount,
    );
    expect(n).toBe(0);
    await expect(asService(db.client, `select 1`)).resolves.toBeTruthy();
  });

  it("el médico asignado lo lee con auditoría; el entrenador y otros pacientes no", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const rows = (await q(`select status from public.get_intake($1)`, [c.patientA])).rows;
      await q("reset role");
      const log = (await q(`select action from public.access_log where actor_id = $1 and patient_id = $2`, [c.doctor, c.patientA])).rows;
      return { rows, log };
    });
    expect(r.rows).toEqual([{ status: "enviado" }]);
    expect(r.log.map((x) => x.action)).toContain("ver_cuestionario");

    await expect(asUser(db.client, c.trainer, "aal2", (q) => q(`select * from public.get_intake($1)`, [c.patientA]))).rejects.toThrow(/Sin permiso/);
    const other = await asUser(db.client, c.patientB, "aal1", async (q) => (await q(`select id from public.intake_forms`)).rows);
    expect(other).toHaveLength(0);
  });

  it("el médico sin doble factor no lo ve", async () => {
    await expect(asUser(db.client, c.doctor, "aal1", (q) => q(`select * from public.get_intake($1)`, [c.patientA]))).rejects.toThrow(/doble factor/);
  });
});

describe("Pagos", () => {
  it("el paciente no puede crear ni modificar pagos", async () => {
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) =>
        q(`insert into public.payments (patient_id, concept, amount_cents, status) values ($1, 'valoracion', 1, 'pagado')`, [c.patientA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("el paciente ve sus pagos y no los de otros; el admin ve todos", async () => {
    await asService(db.client, `insert into public.payments (patient_id, concept, amount_cents) values ($1, 'valoracion', 8900), ($2, 'valoracion', 8900)`, [c.patientA, c.patientB]);
    const own = await asUser(db.client, c.patientA, "aal1", async (q) => (await q(`select patient_id from public.payments`)).rows);
    expect(own.map((x) => x.patient_id)).toEqual([c.patientA]);
    const all = await asUser(db.client, c.admin, "aal2", async (q) => (await q(`select patient_id from public.payments`)).rows);
    expect(all).toHaveLength(2);
    const doc = await asUser(db.client, c.doctor, "aal2", async (q) => (await q(`select patient_id from public.payments`)).rows);
    expect(doc).toHaveLength(0);
  });
});

describe("Cola de valoraciones", () => {
  it("aparece el paciente con cuestionario enviado, valoración pagada e inscripción en valoración", async () => {
    await asService(db.client, `update public.payments set status = 'pagado', paid_at = now() where patient_id = $1`, [c.patientA]);
    await asService(db.client, `update public.enrollments set phase = 'valoracion' where patient_id = $1`, [c.patientA]);
    const asDoctor = await asUser(db.client, c.doctor, "aal2", async (q) => (await q(`select patient_id from public.list_pending_assessments()`)).rows);
    expect(asDoctor.map((x) => x.patient_id)).toEqual([c.patientA]);
  });

  it("los pacientes y el personal sin doble factor no pueden listarla", async () => {
    await expect(asUser(db.client, c.patientA, "aal1", (q) => q(`select * from public.list_pending_assessments()`))).rejects.toThrow(/equipo clínico/);
    await expect(asUser(db.client, c.admin, "aal1", (q) => q(`select * from public.list_pending_assessments()`))).rejects.toThrow(/equipo clínico/);
  });
});
