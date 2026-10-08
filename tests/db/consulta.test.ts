import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createTestDb, seedCast, type Cast, type TestDb } from "./helpers";

let db: TestDb;
let c: Cast;

const nota = { kind: "valoracion", modality: "video", motivo: "Valoración inicial", valoracion: "Candidata al programa", plan: "Receta emitida fuera" };
const medida = { peso_kg: 92.5, grasa_pct: 38.2, masa_magra_kg: 54.1, prension_kg: 25, ta_sistolica: 132, ta_diastolica: 84 };
const plan = { route: "sin_farmaco", proteina_g_dia: 110, fuerza_sesiones_semana: 2, fase_dieta: "fase_1", proxima_revision: "2026-11-05" };

beforeAll(async () => {
  db = await createTestDb();
  c = await seedCast(db.client);
  // El paciente A vuelve a estar en valoración para probar el paso a fase activa.
  await db.client.query(`update public.enrollments set phase = 'valoracion', route = null where patient_id = $1`, [c.patientA]);
}, 60_000);
afterAll(async () => db?.drop());

describe("Registrar consulta", () => {
  it("el médico asignado registra nota, medición y plan; la inscripción pasa a fase activa y queda auditado", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const id = (await q(`select public.registrar_consulta($1, $2, $3, $4) as id`, [c.patientA, nota, medida, plan])).rows[0].id;
      const enr = (await q(`select phase, route from public.enrollments where patient_id = $1`, [c.patientA])).rows[0];
      const m = (await q(`select peso_kg, encounter_id from public.measurements where patient_id = $1`, [c.patientA])).rows[0];
      const p = (await q(`select route, encounter_id, supersedes from public.care_plans where patient_id = $1`, [c.patientA])).rows[0];
      await q("reset role");
      const log = (await q(`select action from public.access_log where actor_id = $1 and patient_id = $2`, [c.doctor, c.patientA])).rows;
      return { id, enr, m, p, log };
    });
    expect(r.enr).toEqual({ phase: "activa", route: "sin_farmaco" });
    expect(Number(r.m.peso_kg)).toBe(92.5);
    expect(r.m.encounter_id).toBe(r.id);
    expect(r.p).toMatchObject({ route: "sin_farmaco", encounter_id: r.id, supersedes: null });
    expect(r.log.map((x) => x.action)).toContain("registrar_consulta");
  });

  it("una consulta sin plan no toca la inscripción ni crea medición vacía", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      await q(`select public.registrar_consulta($1, $2, $3, null)`, [c.patientA, { kind: "seguimiento", plan: "Sigue igual" }, { peso_kg: null }]);
      return {
        enr: (await q(`select phase, route from public.enrollments where patient_id = $1`, [c.patientA])).rows[0],
        n: (await q(`select count(*)::int as n from public.measurements where patient_id = $1`, [c.patientA])).rows[0].n,
      };
    });
    expect(r.enr).toEqual({ phase: "valoracion", route: null });
    expect(r.n).toBe(0);
  });

  it("un plan nuevo enlaza con el anterior", async () => {
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      await q(`select public.registrar_consulta($1, $2, null, $3)`, [c.patientA, nota, plan]);
      await q(`select public.registrar_consulta($1, $2, null, $3)`, [c.patientA, { kind: "seguimiento", plan: "Cambio" }, { route: "farmaco", medicacion: "Pauta indicada en consulta", proteina_g_dia: 100 }]);
      return (await q(`select route, supersedes from public.care_plans where patient_id = $1 order by created_at`, [c.patientA])).rows;
    });
    expect(r).toHaveLength(2);
    expect(r[1].supersedes).not.toBeNull();
  });

  it("la ruta sin fármaco no admite medicación", async () => {
    await expect(
      asUser(db.client, c.doctor, "aal2", (q) =>
        q(`select public.registrar_consulta($1, $2, null, $3)`, [c.patientA, nota, { ...plan, medicacion: "x" }]),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("ni el médico no asignado, ni el entrenador, ni sin doble factor, ni el paciente", async () => {
    await db.client.query(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000d2', 'd2@test.invalid')`);
    await asService(db.client, `update public.profiles set role = 'doctor' where id = '00000000-0000-4000-8000-0000000000d2'`);
    await expect(asUser(db.client, "00000000-0000-4000-8000-0000000000d2", "aal2", (q) => q(`select public.registrar_consulta($1, $2)`, [c.patientA, nota]))).rejects.toThrow(/Sin permiso/);
    await expect(asUser(db.client, c.trainer, "aal2", (q) => q(`select public.registrar_consulta($1, $2)`, [c.patientA, nota]))).rejects.toThrow(/Sin permiso/);
    await expect(asUser(db.client, c.doctor, "aal1", (q) => q(`select public.registrar_consulta($1, $2)`, [c.patientA, nota]))).rejects.toThrow(/doble factor/);
    await expect(asUser(db.client, c.patientA, "aal1", (q) => q(`select public.registrar_consulta($1, $2)`, [c.patientA, nota]))).rejects.toThrow(/doble factor/);
    await expect(
      asUser(db.client, c.patientA, "aal1", (q) => q(`insert into public.encounters (patient_id, author_id, kind, plan) values ($1, $1, 'otra', 'x')`, [c.patientA])),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("Historia clínica", () => {
  it("es inmutable", async () => {
    const id = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const enc = (await q(`select public.registrar_consulta($1, $2, $3, null) as id`, [c.patientA, nota, medida])).rows[0].id;
      await q("reset role");
      await q(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "service_role" })]);
      await expect(q(`update public.encounters set plan = 'x' where id = $1`, [enc])).rejects.toThrow(/inmutable/);
      return enc;
    });
    expect(id).toBeTruthy();
  });

  it("el médico la lee con auditoría; el entrenador ve mediciones y plan pero no notas", async () => {
    await asService(
      db.client,
      `insert into public.encounters (patient_id, author_id, kind, plan) values ($1, $2, 'valoracion', 'Plan');
       insert into public.measurements (patient_id, recorded_by, peso_kg) values ($1, $2, 90);`.replace(/\$1/g, `'${c.patientA}'`).replace(/\$2/g, `'${c.doctor}'`),
    );
    const r = await asUser(db.client, c.doctor, "aal2", async (q) => {
      const rec = (await q(`select public.get_clinical_record($1) as r`, [c.patientA])).rows[0].r;
      await q("reset role");
      const log = (await q(`select action from public.access_log where actor_id = $1`, [c.doctor])).rows;
      return { rec, log };
    });
    expect(r.rec.encounters.length).toBeGreaterThan(0);
    expect(r.log.map((x) => x.action)).toContain("ver_historia");

    const t = await asUser(db.client, c.trainer, "aal2", async (q) => ({
      enc: (await q(`select id from public.encounters`)).rows.length,
      med: (await q(`select id from public.measurements`)).rows.length,
    }));
    expect(t.enc).toBe(0);
    expect(t.med).toBeGreaterThan(0);
    await expect(asUser(db.client, c.trainer, "aal2", (q) => q(`select public.get_clinical_record($1)`, [c.patientA]))).rejects.toThrow(/Sin permiso/);
  });

  it("el paciente ve lo suyo y no lo de otros", async () => {
    const a = await asUser(db.client, c.patientA, "aal1", async (q) => (await q(`select id from public.measurements`)).rows.length);
    const b = await asUser(db.client, c.patientB, "aal1", async (q) => (await q(`select id from public.measurements`)).rows.length);
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(0);
  });

  it("el paciente ve el nombre de su equipo", async () => {
    const r = await asUser(db.client, c.patientA, "aal1", async (q) => (await q(`select staff_role, first_name from public.my_care_team()`)).rows);
    expect(r).toContainEqual({ staff_role: "doctor", first_name: "Dra" });
  });
});

describe("Equipo asignado", () => {
  it("solo se asigna como médico a quien tiene ese rol, y no se borra el historial", async () => {
    await expect(
      asUser(db.client, c.admin, "aal2", (q) =>
        q(`insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor')`, [c.patientB, c.trainer]),
      ),
    ).rejects.toThrow(/rol de doctor/);
    const n = await asUser(db.client, c.admin, "aal2", async (q) =>
      (await q(`insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor')`, [c.patientB, c.doctor])).rowCount,
    );
    expect(n).toBe(1);
    await expect(asUser(db.client, c.admin, "aal2", (q) => q(`delete from public.care_team`))).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db.client, c.doctor, "aal2", (q) => q(`insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor')`, [c.patientB, c.doctor])),
    ).rejects.toThrow(/row-level security/);
  });
});
