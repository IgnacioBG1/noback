-- NoBack · Fases del Método Essential Diet en el plan.
-- El contenido de cada fase (comidas, listas, bebidas…) vive versionado en el código (src/content/essential.ts);
-- aquí se guarda en qué fase pone el médico al paciente, cuántos productos al día y durante cuántos días.

alter table public.care_plans drop constraint if exists care_plans_fase_dieta_check;
alter table public.care_plans add constraint care_plans_fase_dieta_check check (fase_dieta in (
  'fase_1', 'fase_2_1', 'fase_2_2', 'fase_3', 'fase_3_1', 'fase_3_2', 'fase_3_3', 'fase_3_4',
  'mantenimiento', 'mixto', 'sm_1', 'sm_2_1', 'sm_2_2'
));
alter table public.care_plans
  add column productos_dia integer check (productos_dia between 0 and 8),
  add column periodo_dias  integer check (periodo_dias between 1 and 365),
  add column fase_inicio   date,
  add column mixto_opcion  text check (mixto_opcion in ('A', 'B', 'C')),
  add column suplementos   text[] not null default '{}' check (cardinality(suplementos) <= 25),
  add check (fase_dieta = 'mixto' or mixto_opcion is null);

-- Varios planes en la misma transacción deben quedar ordenados: hora real, no la de inicio de la transacción.
alter table public.care_plans alter column created_at set default clock_timestamp();
alter table public.encounters alter column created_at set default clock_timestamp();

-- Plan nuevo: si la dieta pasa a mantenimiento, la inscripción también.
create or replace function app.sync_enrollment_phase() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.fase_dieta = 'mantenimiento' then
    update public.enrollments set phase = 'mantenimiento'
     where patient_id = new.patient_id and ended_on is null and phase in ('valoracion', 'activa');
  end if;
  return new;
end
$$;
create trigger care_plans_sync_phase after insert on public.care_plans
  for each row execute function app.sync_enrollment_phase();

-- registrar_consulta guarda también los campos nuevos del plan.
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
                                   fase_dieta, medicacion, indicaciones, proxima_revision, supersedes,
                                   productos_dia, periodo_dias, fase_inicio, mixto_opcion, suplementos)
    values (
      p_patient, v_enc, v_route,
      (p_plan ->> 'proteina_g_dia')::integer, (p_plan ->> 'fuerza_sesiones_semana')::integer, (p_plan ->> 'pasos_dia')::integer,
      nullif(p_plan ->> 'fase_dieta', ''), nullif(p_plan ->> 'medicacion', ''), nullif(p_plan ->> 'indicaciones', ''),
      (p_plan ->> 'proxima_revision')::date, v_prev,
      (p_plan ->> 'productos_dia')::integer, (p_plan ->> 'periodo_dias')::integer,
      case when nullif(p_plan ->> 'fase_dieta', '') is not null then coalesce((p_plan ->> 'fase_inicio')::date, current_date) end,
      nullif(p_plan ->> 'mixto_opcion', ''),
      coalesce(array(select jsonb_array_elements_text(p_plan -> 'suplementos')), '{}')
    );
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

-- Cambio rápido de fase de la dieta, sin nota de consulta: crea un plan nuevo igual al vigente con la fase nueva.
create or replace function public.cambiar_fase(
  p_patient uuid, p_fase text, p_productos_dia integer default null, p_periodo_dias integer default null, p_mixto_opcion text default null
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v public.care_plans;
  v_new uuid;
begin
  if not app.is_staff() or not app.is_aal2() then
    raise exception 'Solo para el equipo clínico con doble factor' using errcode = '42501';
  end if;
  if not (app.is_admin() or app.is_assigned(p_patient, 'doctor')) then
    raise exception 'Sin permiso para este paciente' using errcode = '42501';
  end if;
  select * into v from public.care_plans where patient_id = p_patient order by created_at desc limit 1;
  if v.id is null or v.route <> 'sin_farmaco' then
    raise exception 'El paciente no tiene un plan con dieta proteinada';
  end if;
  insert into public.care_plans (patient_id, encounter_id, route, proteina_g_dia, fuerza_sesiones_semana, pasos_dia,
                                 fase_dieta, medicacion, indicaciones, proxima_revision, supersedes,
                                 productos_dia, periodo_dias, fase_inicio, mixto_opcion, suplementos)
  values (p_patient, null, v.route, v.proteina_g_dia, v.fuerza_sesiones_semana, v.pasos_dia,
          p_fase, null, v.indicaciones, v.proxima_revision, v.id,
          p_productos_dia, p_periodo_dias, current_date, case when p_fase = 'mixto' then p_mixto_opcion end, v.suplementos)
  returning id into v_new;
  perform app.log_access(p_patient, 'cambiar_fase', jsonb_build_object('fase', p_fase));
  return v_new;
end
$$;
revoke execute on function public.cambiar_fase(uuid, text, integer, integer, text) from anon, public;
grant execute on function public.cambiar_fase(uuid, text, integer, integer, text) to authenticated;
