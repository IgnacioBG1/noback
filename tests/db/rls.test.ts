import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, seedCast, type Cast, type Row, type TestDb } from "./helpers";

let db: TestDb;
let c: Cast;

beforeAll(async () => {
  db = await createTestDb();
  c = await seedCast(db.client);
}, 60_000);

afterAll(async () => {
  await db?.drop();
});

const ids = (rows: Row[]) => rows.map((r) => r.id).sort();

describe("Pacientes", () => {
  it("un paciente solo ve su propio perfil", async () => {
    const rows = await asUser(db.client, c.patientA, "aal1", async (q) => (await q("select id from public.profiles")).rows);
    expect(ids(rows)).toEqual([c.patientA]);
  });

  it("un paciente no puede leer la ficha de otro paciente", async () => {
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) => q("select * from public.get_patient_card($1)", [c.patientB])),
    ).rejects.toThrow(/Sin permiso/);
  });

  it("un paciente no puede cambiarse el rol", async () => {
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) => q(`update public.profiles set role = 'admin' where id = $1`, [c.patientA])),
    ).rejects.toThrow(/permission denied/);
  });

  it("un paciente sí puede editar sus datos personales", async () => {
    const n = await asUser(db.client, c.patientA, "aal1", async (q) =>
      (await q(`update public.profiles set first_name = 'Ana María' where id = $1`, [c.patientA])).rowCount,
    );
    expect(n).toBe(1);
  });

  it("un paciente no puede asignarse un médico", async () => {
    await expect(
      asUser(db.client, c.patientB, "aal1", (q) =>
        q(`insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor')`, [c.patientB, c.doctor]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un anónimo no ve nada", async () => {
    await expect(asUser(db.client, null, "aal1", (q) => q("select id from public.profiles"))).rejects.toThrow(/permission denied/);
  });
});

describe("Personal clínico", () => {
  it("sin doble factor, el médico no ve a ningún paciente", async () => {
    const rows = await asUser(db.client, c.doctor, "aal1", async (q) => (await q("select id from public.profiles")).rows);
    expect(rows).toHaveLength(0);
  });

  it("sin doble factor, el médico solo puede saber su propio rol", async () => {
    const role = await asUser(db.client, c.doctor, "aal1", async (q) => (await q("select public.my_role() as r")).rows[0].r);
    expect(role).toBe("doctor");
  });

  it("sin doble factor, la ficha auditada se rechaza", async () => {
    await expect(
      asUser(db.client, c.doctor, "aal1", (q) => q("select * from public.get_patient_card($1)", [c.patientA])),
    ).rejects.toThrow(/doble factor/);
  });

  it("con doble factor, el médico ve a su paciente y a sí mismo, pero no a otros", async () => {
    const rows = await asUser(db.client, c.doctor, "aal2", async (q) => (await q("select id from public.profiles")).rows);
    expect(ids(rows)).toEqual([c.doctor, c.patientA].sort());
  });

  it("el médico no puede leer la ficha de un paciente no asignado", async () => {
    await expect(
      asUser(db.client, c.doctor, "aal2", (q) => q("select * from public.get_patient_card($1)", [c.patientB])),
    ).rejects.toThrow(/Sin permiso/);
  });

  it("leer la ficha deja rastro en la auditoría dentro de la misma transacción", async () => {
    const logged = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const card = await q("select * from public.get_patient_card($1)", [c.patientA]);
      expect(card.rows[0].first_name).toBe("Ana");
      expect(card.rows[0].phase).toBe("activa");
      await q("reset role");
      return (await q(`select actor_id, patient_id, action from public.access_log where patient_id = $1`, [c.patientA])).rows;
    });
    expect(logged).toEqual([{ actor_id: c.doctor, patient_id: c.patientA, action: "ver_ficha" }]);
  });

  it("el entrenador ve la inscripción de su paciente pero no puede modificarla", async () => {
    await asUser(db.client, c.trainer, "aal2", async (q) => {
      const r = await q("select patient_id from public.enrollments");
      expect(r.rows.map((x) => x.patient_id)).toEqual([c.patientA]);
      const u = await q(`update public.enrollments set phase = 'mantenimiento' where patient_id = $1`, [c.patientA]);
      expect(u.rowCount).toBe(0);
    });
  });

  it("el entrenador no ve los consentimientos (datos no deportivos)", async () => {
    await asService(db.client, `insert into public.consents (user_id, kind, text_version, granted) values ($1, 'privacidad', 'v1', true)`, [c.patientA]);
    const rows = await asUser(db.client, c.trainer, "aal2", async (q) => (await q("select id from public.consents")).rows);
    expect(rows).toHaveLength(0);
  });

  it("el médico asignado puede cambiar la fase; el no asignado, no", async () => {
    const ok = await asUser(db.client, c.doctor, "aal2", async (q) =>
      (await q(`update public.enrollments set phase = 'mantenimiento' where patient_id = $1`, [c.patientA])).rowCount,
    );
    expect(ok).toBe(1);
    await expect(
      asUser(db.client, c.doctor, "aal2", (q) =>
        q(`insert into public.enrollments (patient_id, phase) values ($1, 'valoracion')`, [c.patientB]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un médico no puede cambiarse el rol a admin", async () => {
    await expect(
      asUser(db.client, c.doctor, "aal2", (q) => q(`update public.profiles set role = 'admin' where id = $1`, [c.doctor])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("Admin", () => {
  it("con doble factor ve la auditoría; sin él, no", async () => {
    await asService(db.client, `insert into public.access_log (actor_id, patient_id, action) values ($1, $2, 'seed_admin')`, [c.doctor, c.patientA]);
    const without = await asUser(db.client, c.admin, "aal1", async (q) => (await q("select id from public.access_log")).rows);
    expect(without).toHaveLength(0);
    await asUser(db.client, c.admin, "aal2", async (q) => {
      await q("select app.log_access($1, 'prueba')", [c.patientA]);
      const r = await q("select id from public.access_log");
      expect(r.rows.length).toBeGreaterThan(0);
    });
  });

  it("puede asignar equipo con doble factor", async () => {
    const n = await asUser(db.client, c.admin, "aal2", async (q) =>
      (await q(`insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor')`, [c.patientB, c.doctor])).rowCount,
    );
    expect(n).toBe(1);
  });
});

describe("Inmutabilidad y conservación", () => {
  it("la auditoría no se puede modificar ni borrar, ni siquiera como servidor", async () => {
    await asService(db.client, `insert into public.access_log (actor_id, patient_id, action) values ($1, $2, 'seed')`, [c.admin, c.patientA]);
    await expect(asService(db.client, `update public.access_log set action = 'x'`)).rejects.toThrow(/inmutable/);
    await expect(asService(db.client, `delete from public.access_log`)).rejects.toThrow(/inmutable/);
    await expect(asService(db.client, `truncate public.access_log`)).rejects.toThrow(/inmutable/);
  });

  it("los consentimientos no se pueden modificar: revocar es un registro nuevo", async () => {
    await expect(asService(db.client, `update public.consents set granted = false`)).rejects.toThrow(/inmutable/);
    const n = await asUser(db.client, c.patientA, "aal1", async (q) =>
      (await q(`insert into public.consents (user_id, kind, text_version, granted) values ($1, 'agente_ia', 'v1', false)`, [c.patientA])).rowCount,
    );
    expect(n).toBe(1);
  });

  it("un paciente no puede registrar consentimientos en nombre de otro", async () => {
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) =>
        q(`insert into public.consents (user_id, kind, text_version, granted) values ($1, 'privacidad', 'v1', true)`, [c.patientB]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("borrar un usuario con historia falla (conservación mínima de 5 años)", async () => {
    await expect(db.client.query(`delete from auth.users where id = $1`, [c.patientA])).rejects.toThrow(/foreign key/);
  });

  it("todo usuario nuevo nace como paciente", async () => {
    const r = await db.client.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'nuevo@test.invalid') returning id`);
    const p = await db.client.query(`select role from public.profiles where id = $1`, [r.rows[0].id]);
    expect(p.rows[0].role).toBe("patient");
  });
});
