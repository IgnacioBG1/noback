-- NoBack · Bloque 3 · Consulta médica, mediciones y plan.
-- Todo es inmutable: una corrección es un registro nuevo que apunta al anterior (Ley 41/2002).
-- La receta y la videoconsulta se hacen fuera de NoBack (plataforma del Colegio de Médicos y la herramienta
-- de vídeo de la clínica); en la nota queda constancia en texto libre.

-- ─────────────────────────── Consultas ───────────────────────────
create type public.encounter_kind as enum ('valoracion', 'seguimiento', 'otra');

create table public.encounters (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.profiles (id) on delete restrict,
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  kind         public.encounter_kind not null,
  modality     text not null default 'video' check (modality in ('presencial', 'video', 'telefono')),
  occurred_at  timestamptz not null default now(),
  motivo       text check (length(motivo) <= 2000),
  subjetivo    text check (length(subjetivo) <= 8000),   -- anamnesis, lo que cuenta el paciente
  objetivo     text check (length(objetivo) <= 8000),    -- exploración y pruebas
  valoracion   text check (length(valoracion) <= 8000),  -- juicio clínico
  plan         text check (length(plan) <= 8000),        -- conducta, incluida la receta hecha fuera
  corrects     uuid references public.encounters (id) on delete restrict,
  created_at   timestamptz not null default now(),
  check (coalesce(valoracion, '') <> '' or coalesce(plan, '') <> '')
);
create index encounters_patient_idx on public.encounters (patient_id, occurred_at desc);
comment on table public.encounters is 'Notas de consulta (SOAP). Inmutables: las correcciones son notas nuevas con corrects.';

-- ─────────────────────────── Mediciones ───────────────────────────
create table public.measurements (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles (id) on delete restrict,
  encounter_id   uuid references public.encounters (id) on delete restrict,
  source         text not null default 'consulta' check (source in ('consulta', 'paciente', 'dispositivo')),
  measured_at    timestamptz not null default now(),
  recorded_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  peso_kg        numeric(5, 2) check (peso_kg between 30 and 350),
  grasa_pct      numeric(4, 1) check (grasa_pct between 3 and 75),
  masa_magra_kg  numeric(5, 2) check (masa_magra_kg between 10 and 150),
  cintura_cm     numeric(5, 1) check (cintura_cm between 40 and 250),
  prension_kg    numeric(4, 1) check (prension_kg between 0 and 120),
  ta_sistolica   integer check (ta_sistolica between 60 and 260),
  ta_diastolica  integer check (ta_diastolica between 30 and 160),
  fc_lpm         integer check (fc_lpm between 30 and 220),
  created_at     timestamptz not null default now(),
  check (num_nonnulls(peso_kg, grasa_pct, masa_magra_kg, cintura_cm, prension_kg, ta_sistolica, ta_diastolica, fc_lpm) > 0)
);
create index measurements_patient_idx on public.measurements (patient_id, measured_at);

-- ─────────────────────────── Plan ───────────────────────────
create table public.care_plans (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.profiles (id) on delete restrict,
  encounter_id            uuid references public.encounters (id) on delete restrict,
  route                   public.program_route not null,
  created_by              uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  proteina_g_dia          integer check (proteina_g_dia between 40 and 300),
  fuerza_sesiones_semana  integer check (fuerza_sesiones_semana between 0 and 7),
  pasos_dia               integer check (pasos_dia between 0 and 40000),
  fase_dieta              text check (fase_dieta in ('fase_1', 'fase_2', 'fase_3', 'reintroduccion')),
  medicacion              text check (length(medicacion) <= 1000),
  indicaciones            text check (length(indicaciones) <= 4000),
  proxima_revision        date,
  supersedes              uuid references public.care_plans (id) on delete restrict,
  created_at              timestamptz not null default now(),
  check (route = 'farmaco' or medicacion is null),
  check (route = 'sin_farmaco' or fase_dieta is null)
);
create index care_plans_patient_idx on public.care_plans (patient_id, created_at desc);
comment on table public.care_plans is 'Plan vigente = el último del paciente. Inmutable: cambiar el plan es crear uno nuevo.';

-- ─────────────────────────── Inmutabilidad ───────────────────────────
do $$
declare t text;
begin
  foreach t in array array['encounters', 'measurements', 'care_plans'] loop
    execute format('create trigger %1$s_immutable before update or delete on public.%1$I for each row execute function app.forbid_change()', t);
    execute format('create trigger %1$s_no_truncate before truncate on public.%1$I for each statement execute function app.forbid_change()', t);
  end loop;
end
$$;

-- ─────────────────────────── RLS ───────────────────────────
alter table public.encounters enable row level security;
alter table public.measurements enable row level security;
alter table public.care_plans enable row level security;

do $$
declare t text;
begin
  foreach t in array array['encounters', 'measurements', 'care_plans'] loop
    execute format(
      'create policy staff_requires_aal2 on public.%I as restrictive for all to authenticated
         using (not app.is_staff() or app.is_aal2()) with check (not app.is_staff() or app.is_aal2())', t);
  end loop;
end
$$;

-- Notas: el paciente, su médico y admin. El entrenador no.
create policy encounters_select on public.encounters for select to authenticated
  using (app.can_read_clinical(patient_id));
create policy encounters_insert on public.encounters for insert to authenticated
  with check (author_id = auth.uid() and (app.is_admin() or app.is_assigned(patient_id, 'doctor')));

-- Mediciones y plan: también el entrenador asignado (los necesita para su trabajo).
create policy measurements_select on public.measurements for select to authenticated
  using (app.can_read_training(patient_id));
create policy measurements_insert on public.measurements for insert to authenticated
  with check (recorded_by = auth.uid() and source <> 'paciente' and (app.is_admin() or app.is_assigned(patient_id)));

create policy care_plans_select on public.care_plans for select to authenticated
  using (app.can_read_training(patient_id));
create policy care_plans_insert on public.care_plans for insert to authenticated
  with check (created_by = auth.uid() and (app.is_admin() or app.is_assigned(patient_id, 'doctor')));

revoke all on public.encounters, public.measurements, public.care_plans from anon, authenticated;
grant select, insert on public.encounters, public.measurements, public.care_plans to authenticated;
grant select, insert on public.encounters, public.measurements, public.care_plans to service_role;

-- ─────────────────────────── Equipo asignado ───────────────────────────
-- Solo se asigna como médico a quien tiene rol de médico (o admin), y lo mismo con el entrenador.
create or replace function app.guard_care_team() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.app_role;
begin
  select role into r from public.profiles where id = new.staff_id;
  if r is null or not (r = new.staff_role or r = 'admin') then
    raise exception 'Esa persona no tiene el rol de %', new.staff_role;
  end if;
  if (select role from public.profiles where id = new.patient_id) <> 'patient' then
    raise exception 'Solo se asigna equipo a pacientes';
  end if;
  return new;
end
$$;
create trigger care_team_guard before insert or update on public.care_team
  for each row execute function app.guard_care_team();

-- El historial de asignaciones se conserva: se cierra con until, no se borra.
revoke delete on public.care_team from authenticated;

-- ─────────────────────────── Funciones ───────────────────────────
-- Registra una consulta completa en una sola transacción: nota, mediciones y, si se indica, plan nuevo.
-- security invoker: las políticas de RLS de cada tabla se aplican al médico que llama.
create or replace function public.registrar_consulta(
  p_patient uuid, p_encounter jsonb, p_measurement jsonb default null, p_plan jsonb default null
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_enc uuid;
  v_prev uuid;
  v_route public.program_route;
begin
  if not app.is_staff() or not app.is_aal2() then
    raise exception 'Solo para el equipo clínico con doble factor' using errcode = '42501';
  end if;
  if not (app.is_admin() or app.is_assigned(p_patient, 'doctor')) then
    raise exception 'Sin permiso para este paciente' using errcode = '42501';
  end if;

  insert into public.encounters (patient_id, kind, modality, occurred_at, motivo, subjetivo, objetivo, valoracion, plan, corrects)
  values (
    p_patient,
    (p_encounter ->> 'kind')::public.encounter_kind,
    coalesce(p_encounter ->> 'modality', 'video'),
    coalesce((p_encounter ->> 'occurred_at')::timestamptz, now()),
    nullif(p_encounter ->> 'motivo', ''),
    nullif(p_encounter ->> 'subjetivo', ''),
    nullif(p_encounter ->> 'objetivo', ''),
    nullif(p_encounter ->> 'valoracion', ''),
    nullif(p_encounter ->> 'plan', ''),
    (p_encounter ->> 'corrects')::uuid
  ) returning id into v_enc;

  if p_measurement is not null and exists (select 1 from jsonb_each(p_measurement) where value <> 'null'::jsonb) then
    insert into public.measurements (patient_id, encounter_id, source, measured_at, peso_kg, grasa_pct, masa_magra_kg,
                                     cintura_cm, prension_kg, ta_sistolica, ta_diastolica, fc_lpm)
    values (
      p_patient, v_enc, 'consulta', coalesce((p_encounter ->> 'occurred_at')::timestamptz, now()),
      (p_measurement ->> 'peso_kg')::numeric, (p_measurement ->> 'grasa_pct')::numeric,
      (p_measurement ->> 'masa_magra_kg')::numeric, (p_measurement ->> 'cintura_cm')::numeric,
      (p_measurement ->> 'prension_kg')::numeric, (p_measurement ->> 'ta_sistolica')::integer,
      (p_measurement ->> 'ta_diastolica')::integer, (p_measurement ->> 'fc_lpm')::integer
    );
  end if;

  if p_plan is not null then
    v_route := (p_plan ->> 'route')::public.program_route;
    select id into v_prev from public.care_plans where patient_id = p_patient order by created_at desc limit 1;
    insert into public.care_plans (patient_id, encounter_id, route, proteina_g_dia, fuerza_sesiones_semana, pasos_dia,
                                   fase_dieta, medicacion, indicaciones, proxima_revision, supersedes)
    values (
      p_patient, v_enc, v_route,
      (p_plan ->> 'proteina_g_dia')::integer, (p_plan ->> 'fuerza_sesiones_semana')::integer, (p_plan ->> 'pasos_dia')::integer,
      nullif(p_plan ->> 'fase_dieta', ''), nullif(p_plan ->> 'medicacion', ''), nullif(p_plan ->> 'indicaciones', ''),
      (p_plan ->> 'proxima_revision')::date, v_prev
    );
    -- La inscripción abierta pasa a fase activa (si estaba en valoración) con la ruta elegida.
    update public.enrollments
       set route = v_route,
           phase = case when phase = 'valoracion' then 'activa'::public.program_phase else phase end
     where patient_id = p_patient and ended_on is null;
    if not found then
      raise exception 'El paciente no tiene una inscripción abierta';
    end if;
  end if;

  perform app.log_access(p_patient, 'registrar_consulta', jsonb_build_object('encounter', v_enc, 'plan', p_plan is not null));
  return v_enc;
end
$$;

-- Historia clínica para el médico (auditada): notas, mediciones y planes.
create or replace function public.get_clinical_record(p_patient uuid) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if not app.can_read_clinical(p_patient) then
    raise exception 'Sin permiso para ver este paciente' using errcode = '42501';
  end if;
  if app.is_staff() and not app.is_aal2() then
    raise exception 'Se requiere doble factor' using errcode = '42501';
  end if;
  if p_patient <> auth.uid() then
    perform app.log_access(p_patient, 'ver_historia');
  end if;
  select jsonb_build_object(
    'encounters', coalesce((
      select jsonb_agg(to_jsonb(e) || jsonb_build_object('author', concat_ws(' ', a.first_name, a.last_name)) order by e.occurred_at desc, e.created_at desc)
      from public.encounters e left join public.profiles a on a.id = e.author_id where e.patient_id = p_patient), '[]'::jsonb),
    'measurements', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.measured_at) from public.measurements m where m.patient_id = p_patient), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.care_plans c where c.patient_id = p_patient), '[]'::jsonb)
  ) into v;
  return v;
end
$$;

revoke execute on function public.registrar_consulta(uuid, jsonb, jsonb, jsonb), public.get_clinical_record(uuid) from anon, public;
grant execute on function public.registrar_consulta(uuid, jsonb, jsonb, jsonb), public.get_clinical_record(uuid) to authenticated;

-- El paciente ve el nombre de su equipo actual (sin acceso al resto de perfiles).
create or replace function public.my_care_team()
returns table (staff_role public.app_role, first_name text, last_name text, since date)
language sql stable security definer set search_path = public, pg_temp as $$
  select ct.staff_role, p.first_name, p.last_name, ct.since
  from public.care_team ct join public.profiles p on p.id = ct.staff_id
  where ct.patient_id = auth.uid() and (ct.until is null or ct.until >= current_date)
  order by ct.staff_role, ct.since desc
$$;
revoke execute on function public.my_care_team() from anon, public;
grant execute on function public.my_care_team() to authenticated;
