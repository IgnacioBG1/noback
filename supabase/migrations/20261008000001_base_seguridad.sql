-- NoBack · Bloque 1 · Base de datos y seguridad
-- Personas, equipo asignado, inscripciones, consentimientos, auditoría y derechos RGPD.
-- Reglas clave (ver "Arquitectura técnica y modelo de datos"):
--   * RLS en todas las tablas; el personal solo ve a sus pacientes (care_team).
--   * El personal (médico, entrenador, admin) necesita doble factor (aal2) para cualquier acceso.
--   * access_log y consents son inmutables.
--   * Nada clínico se borra en cascada: borrar un usuario con historia falla (Ley 41/2002, art. 17).

create extension if not exists pgcrypto;

create schema if not exists app;
comment on schema app is 'Funciones internas de NoBack (no expuestas por la API).';

-- ─────────────────────────── Tipos ───────────────────────────
create type public.app_role as enum ('patient', 'doctor', 'trainer', 'admin');
create type public.program_phase as enum ('valoracion', 'activa', 'mantenimiento', 'baja');
create type public.program_route as enum ('farmaco', 'sin_farmaco');
create type public.consent_kind as enum (
  'privacidad', 'telemedicina_whatsapp', 'tratamiento_glp1', 'dieta_proteinada', 'agente_ia', 'uso_comunicacion'
);
create type public.rights_kind as enum ('acceso', 'rectificacion', 'supresion', 'oposicion', 'limitacion', 'portabilidad');

-- ─────────────────────────── Tablas ───────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete restrict,
  role        public.app_role not null default 'patient',
  first_name  text,
  last_name   text,
  birth_date  date,
  sex         text check (sex in ('mujer', 'hombre')),
  dni_enc     text,                      -- DNI/NIE cifrado en la aplicación (AES-256-GCM)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Una fila por usuario. El rol solo lo cambia un admin.';

create table public.care_team (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete restrict,
  staff_id    uuid not null references public.profiles (id) on delete restrict,
  staff_role  public.app_role not null check (staff_role in ('doctor', 'trainer')),
  since       date not null default current_date,
  until       date,
  created_at  timestamptz not null default now(),
  unique (patient_id, staff_id, since)
);
create index care_team_staff_idx on public.care_team (staff_id) where until is null;

create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete restrict,
  phase       public.program_phase not null default 'valoracion',
  route       public.program_route,
  started_on  date not null default current_date,
  ended_on    date,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index enrollments_patient_idx on public.enrollments (patient_id);

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete restrict,
  kind         public.consent_kind not null,
  text_version text not null,            -- versión del texto aceptado
  granted      boolean not null,         -- true = otorga, false = revoca
  evidence     jsonb not null default '{}'::jsonb,  -- canal, user agent, hash del documento firmado
  created_at   timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, created_at desc);

create table public.access_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null,
  patient_id  uuid,
  action      text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index access_log_patient_idx on public.access_log (patient_id, created_at desc);

create table public.rights_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete restrict,
  kind         public.rights_kind not null,
  detail       text,
  status       text not null default 'pendiente' check (status in ('pendiente', 'en_curso', 'resuelta', 'denegada')),
  resolved_by  uuid references public.profiles (id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────── Funciones de seguridad ───────────────────────────
-- security definer + search_path fijo: se pueden usar dentro de políticas sin recursión de RLS.

create or replace function app.current_role() returns public.app_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function app.is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app.current_role() in ('doctor', 'trainer', 'admin'), false)
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app.current_role() = 'admin', false)
$$;

create or replace function app.is_aal2() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

-- ¿El usuario actual es profesional asignado (vigente) a este paciente? Opcionalmente, de un rol concreto.
create or replace function app.is_assigned(p_patient uuid, p_role public.app_role default null) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.care_team ct
    where ct.patient_id = p_patient
      and ct.staff_id = auth.uid()
      and (ct.until is null or ct.until >= current_date)
      and (p_role is null or ct.staff_role = p_role)
  )
$$;

-- Datos clínicos (analíticas, recetas, notas): el propio paciente, su médico asignado o admin.
create or replace function app.can_read_clinical(p_patient uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_patient = auth.uid() or app.is_admin() or app.is_assigned(p_patient, 'doctor')
$$;

-- Datos de entrenamiento (fuerza, composición, plan de fuerza): además, el entrenador asignado.
create or replace function app.can_read_training(p_patient uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select app.can_read_clinical(p_patient) or app.is_assigned(p_patient, 'trainer')
$$;

-- Registro de acceso. Se llama desde las funciones de lectura en la misma transacción:
-- si el registro falla, la lectura falla.
create or replace function app.log_access(p_patient uuid, p_action text, p_detail jsonb default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'log_access: sin usuario autenticado';
  end if;
  insert into public.access_log (actor_id, patient_id, action, detail)
  values (auth.uid(), p_patient, p_action, p_detail);
end
$$;

grant usage on schema app to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;
revoke execute on all functions in schema app from anon, public;

-- ─────────────────────────── Inmutabilidad ───────────────────────────
create or replace function app.forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception 'La tabla % es inmutable: no se permite %', tg_table_name, tg_op;
end
$$;

create trigger access_log_immutable before update or delete on public.access_log
  for each row execute function app.forbid_change();
create trigger consents_immutable before update or delete on public.consents
  for each row execute function app.forbid_change();
-- TRUNCATE no dispara triggers por fila: se bloquea aparte.
create trigger access_log_no_truncate before truncate on public.access_log
  for each statement execute function app.forbid_change();
create trigger consents_no_truncate before truncate on public.consents
  for each statement execute function app.forbid_change();

-- updated_at
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Nadie salvo un admin (o el servidor con service_role) puede cambiar el rol.
create or replace function app.guard_role_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not (app.is_admin() and app.is_aal2()) then
    raise exception 'Solo un administrador puede cambiar el rol';
  end if;
  return new;
end
$$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function app.guard_role_change();

-- Alta automática del perfil (siempre como paciente) al crear el usuario en Auth.
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, role) values (new.id, 'patient')
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

-- ─────────────────────────── RLS ───────────────────────────
alter table public.profiles        enable row level security;
alter table public.care_team       enable row level security;
alter table public.enrollments     enable row level security;
alter table public.consents        enable row level security;
alter table public.access_log      enable row level security;
alter table public.rights_requests enable row level security;

-- El personal sin doble factor no ve ni toca nada (política restrictiva: se suma con AND a todas).
do $$
declare t text;
begin
  foreach t in array array['profiles', 'care_team', 'enrollments', 'consents', 'access_log', 'rights_requests'] loop
    execute format(
      'create policy staff_requires_aal2 on public.%I as restrictive for all to authenticated
         using (not app.is_staff() or app.is_aal2())
         with check (not app.is_staff() or app.is_aal2())', t);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_admin() or app.is_assigned(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() or app.is_admin())
  with check (id = auth.uid() or app.is_admin());

-- care_team: lo ven el paciente, el profesional implicado y admin; solo admin lo gestiona.
create policy care_team_select on public.care_team for select to authenticated
  using (patient_id = auth.uid() or staff_id = auth.uid() or app.is_admin());
create policy care_team_admin_write on public.care_team for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- enrollments: lectura del paciente y su equipo; escritura del médico asignado o admin.
create policy enrollments_select on public.enrollments for select to authenticated
  using (app.can_read_training(patient_id));
create policy enrollments_doctor_insert on public.enrollments for insert to authenticated
  with check (app.is_admin() or app.is_assigned(patient_id, 'doctor'));
create policy enrollments_doctor_update on public.enrollments for update to authenticated
  using (app.is_admin() or app.is_assigned(patient_id, 'doctor'))
  with check (app.is_admin() or app.is_assigned(patient_id, 'doctor'));

-- consents: el usuario registra y ve los suyos; su médico y admin pueden verlos.
create policy consents_select on public.consents for select to authenticated
  using (user_id = auth.uid() or app.is_admin() or app.is_assigned(user_id, 'doctor'));
create policy consents_insert_own on public.consents for insert to authenticated
  with check (user_id = auth.uid());

-- access_log: solo lectura para admin (y DPD con rol admin). Se escribe vía app.log_access().
create policy access_log_admin_select on public.access_log for select to authenticated
  using (app.is_admin());

-- rights_requests
create policy rights_select on public.rights_requests for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy rights_insert_own on public.rights_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pendiente');
create policy rights_admin_update on public.rights_requests for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ─────────────────────────── Privilegios por columna ───────────────────────────
-- El paciente solo puede editar sus datos personales, nunca el rol.
revoke all on all tables in schema public from anon;
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, birth_date, sex, dni_enc) on public.profiles to authenticated;
grant select on public.profiles, public.care_team, public.enrollments, public.consents,
  public.access_log, public.rights_requests to authenticated;
grant insert on public.consents, public.rights_requests, public.enrollments to authenticated;
grant insert, update, delete on public.care_team to authenticated;
grant update on public.enrollments, public.rights_requests to authenticated;
revoke insert, update, delete on public.access_log from authenticated;

-- Rol propio. Accesible también sin doble factor (solo devuelve el rol de quien pregunta),
-- para que la app sepa enviar al personal a configurar o introducir su segundo factor.
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public, pg_temp as $$
  select app.current_role()
$$;
revoke execute on function public.my_role() from anon, public;
grant execute on function public.my_role() to authenticated;

-- ─────────────────────────── Lecturas auditadas ───────────────────────────
-- Ficha básica de un paciente para el panel clínico: registra el acceso y devuelve los datos.
create or replace function public.get_patient_card(p_patient uuid)
returns table (id uuid, first_name text, last_name text, birth_date date, sex text, phase public.program_phase, route public.program_route)
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not (p_patient = auth.uid() or app.is_admin() or app.is_assigned(p_patient)) then
    raise exception 'Sin permiso para ver este paciente' using errcode = '42501';
  end if;
  if app.is_staff() and not app.is_aal2() then
    raise exception 'Se requiere doble factor' using errcode = '42501';
  end if;
  perform app.log_access(p_patient, 'ver_ficha');
  return query
    select p.id, p.first_name, p.last_name, p.birth_date, p.sex, e.phase, e.route
    from public.profiles p
    left join lateral (
      select en.phase, en.route from public.enrollments en
      where en.patient_id = p.id order by en.started_on desc, en.created_at desc limit 1
    ) e on true
    where p.id = p_patient;
end
$$;
revoke execute on function public.get_patient_card(uuid) from anon, public;
grant execute on function public.get_patient_card(uuid) to authenticated;
