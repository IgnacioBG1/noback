import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const ROOT = join(__dirname, "..", "..");
const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";

export type Aal = "aal1" | "aal2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- filas de prueba sin tipar
export type Row = Record<string, any>;

export interface TestDb {
  url: string;
  name: string;
  client: Client;
  drop: () => Promise<void>;
}

/** Crea una base de datos nueva con el stub de Supabase y todas las migraciones aplicadas. */
export async function createTestDb(): Promise<TestDb> {
  const name = `noback_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = ADMIN_URL.replace(/\/[^/]*$/, `/${name}`);
  const client = new Client({ connectionString: url });
  await client.connect();

  await client.query(readFileSync(join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
  const dir = join(ROOT, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await client.query(readFileSync(join(dir, f), "utf8"));
  }

  return {
    url,
    name,
    client,
    drop: async () => {
      await client.end();
      const a = new Client({ connectionString: ADMIN_URL });
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}

/** Ejecuta `fn` como un usuario autenticado de Supabase, dentro de una transacción que se deshace al final. */
export async function asUser<T>(
  client: Client,
  userId: string | null,
  aal: Aal,
  fn: (q: (sql: string, params?: unknown[]) => Promise<{ rows: Row[]; rowCount: number | null }>) => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    const claims = JSON.stringify(userId ? { sub: userId, role: "authenticated", aal } : { role: "anon" });
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await client.query(`set local role ${userId ? "authenticated" : "anon"}`);
    return await fn((sql, params) => client.query(sql, params) as Promise<{ rows: Row[]; rowCount: number | null }>);
  } finally {
    await client.query("rollback");
  }
}

/** Ejecuta como servidor (service_role, salta RLS) y confirma los cambios. */
export async function asService(client: Client, sql: string, params?: unknown[]) {
  await client.query("begin");
  try {
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "service_role" })]);
    await client.query("set local role service_role"); // con sus privilegios reales, no como superusuario
    const r = await client.query(sql, params);
    await client.query("commit");
    return r;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

export interface Cast {
  patientA: string;
  patientB: string;
  doctor: string;
  trainer: string;
  admin: string;
}

/** Crea usuarios ficticios y asigna médico y entrenador al paciente A (no al B). */
export async function seedCast(client: Client): Promise<Cast> {
  const cast: Cast = {
    patientA: randomUUID(),
    patientB: randomUUID(),
    doctor: randomUUID(),
    trainer: randomUUID(),
    admin: randomUUID(),
  };
  for (const [k, id] of Object.entries(cast)) {
    await client.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${k}@test.invalid`]);
  }
  await asService(client, `update public.profiles set role = 'doctor', first_name = 'Dra', last_name = 'Prueba' where id = $1`, [cast.doctor]);
  await asService(client, `update public.profiles set role = 'trainer' where id = $1`, [cast.trainer]);
  await asService(client, `update public.profiles set role = 'admin' where id = $1`, [cast.admin]);
  await asService(client, `update public.profiles set first_name = 'Ana', last_name = 'Ficticia' where id = $1`, [cast.patientA]);
  await asService(client, `update public.profiles set first_name = 'Beto', last_name = 'Ficticio' where id = $1`, [cast.patientB]);
  await asService(
    client,
    `insert into public.care_team (patient_id, staff_id, staff_role) values ($1, $2, 'doctor'), ($1, $3, 'trainer')`,
    [cast.patientA, cast.doctor, cast.trainer],
  );
  await asService(client, `insert into public.enrollments (patient_id, phase, route) values ($1, 'activa', 'farmaco')`, [cast.patientA]);
  return cast;
}
