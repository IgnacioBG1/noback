-- NoBack · Bloque 2 · Cuestionario de acogida, pagos y alta de pacientes.
-- Los textos de los consentimientos viven versionados en el código (src/content/consentimientos);
-- cada firma guarda la versión y el hash SHA-256 del texto aceptado en consents.evidence.

-- ─────────────────────────── Cuestionario de acogida ───────────────────────────
create type public.intake_status as enum ('borrador', 'enviado');

create table public.intake_forms (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null unique references public.profiles (id) on delete restrict,
  status        public.intake_status not null default 'borrador',
  answers       jsonb not null default '{}'::jsonb,
  form_version  text not null,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.intake_forms is 'Cuestionario de acogida. Lo rellena el paciente; lo interpreta siempre el médico.';

create or replace function app.guard_intake() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and old.status = 'enviado' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'El cuestionario ya se ha enviado y no se puede modificar';
  end if;
  if new.status = 'enviado' and (tg_op = 'INSERT' or old.status = 'borrador') then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end
$$;
create trigger intake_guard before insert or update on public.intake_forms
  for each row execute function app.guard_intake();

alter table public.intake_forms enable row level security;
create policy staff_requires_aal2 on public.intake_forms as restrictive for all to authenticated
  using (not app.is_staff() or app.is_aal2()) with check (not app.is_staff() or app.is_aal2());
create policy intake_select on public.intake_forms for select to authenticated
  using (app.can_read_clinical(patient_id));
create policy intake_insert_own on public.intake_forms for insert to authenticated
  with check (patient_id = auth.uid() and status = 'borrador');
create policy intake_update_own_draft on public.intake_forms for update to authenticated
  using (patient_id = auth.uid() and status = 'borrador')
  with check (patient_id = auth.uid());

revoke all on public.intake_forms from anon, authenticated;
grant select, insert on public.intake_forms to authenticated;
grant update (status, answers, form_version) on public.intake_forms to authenticated;
grant select, insert, update on public.intake_forms to service_role;

-- ─────────────────────────── Pagos ───────────────────────────
create type public.payment_status as enum ('pendiente', 'pagado', 'fallido', 'reembolsado');

create table public.payments (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.profiles (id) on delete restrict,
  concept                text not null check (concept in ('valoracion', 'fase_activa', 'mantenimiento')),
  amount_cents           integer not null check (amount_cents > 0),
  currency               text not null default 'eur',
  status                 public.payment_status not null default 'pendiente',
  stripe_checkout_id     text unique,
  stripe_payment_intent  text,
  paid_at                timestamptz,
  created_at             timestamptz not null default now()
);
create index payments_patient_idx on public.payments (patient_id, created_at desc);

alter table public.payments enable row level security;
create policy staff_requires_aal2 on public.payments as restrictive for all to authenticated
  using (not app.is_staff() or app.is_aal2()) with check (not app.is_staff() or app.is_aal2());
create policy payments_select on public.payments for select to authenticated
  using (patient_id = auth.uid() or app.is_admin());
-- Sin políticas de escritura: solo el servidor (service_role) crea y actualiza pagos.

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
grant select, insert, update on public.payments to service_role;

-- ─────────────────────────── Alta de usuario ───────────────────────────
-- El perfil nace como paciente y toma nombre y apellidos del formulario de registro (metadatos).
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, role, first_name, last_name)
  values (
    new.id,
    'patient',
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 80), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

-- ─────────────────────────── Lecturas auditadas para la clínica ───────────────────────────
create or replace function public.get_intake(p_patient uuid)
returns setof public.intake_forms
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not app.can_read_clinical(p_patient) then
    raise exception 'Sin permiso para ver este paciente' using errcode = '42501';
  end if;
  if app.is_staff() and not app.is_aal2() then
    raise exception 'Se requiere doble factor' using errcode = '42501';
  end if;
  if p_patient <> auth.uid() then
    perform app.log_access(p_patient, 'ver_cuestionario');
  end if;
  return query select * from public.intake_forms where patient_id = p_patient;
end
$$;

-- Valoraciones pagadas pendientes de consulta: admin ve todas; el médico, las de sus pacientes.
create or replace function public.list_pending_assessments()
returns table (patient_id uuid, first_name text, last_name text, submitted_at timestamptz, paid_at timestamptz)
-- security definer: el médico no lee la tabla de pagos, pero sí debe saber si la valoración está pagada.
-- El filtro de pacientes (admin o asignado) se aplica explícitamente abajo.
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.is_staff() or not app.is_aal2() then
    raise exception 'Solo para el equipo clínico con doble factor' using errcode = '42501';
  end if;
  perform app.log_access(null, 'listar_valoraciones');
  return query
    select p.id, p.first_name, p.last_name, i.submitted_at, pay.paid_at
    from public.profiles p
    join public.intake_forms i on i.patient_id = p.id and i.status = 'enviado'
    join lateral (
      select max(x.paid_at) as paid_at from public.payments x
      where x.patient_id = p.id and x.concept = 'valoracion' and x.status = 'pagado'
    ) pay on pay.paid_at is not null
    where (app.is_admin() or app.is_assigned(p.id, 'doctor'))
      and exists (select 1 from public.enrollments e where e.patient_id = p.id and e.phase = 'valoracion' and e.ended_on is null)
    order by pay.paid_at;
end
$$;

-- app.log_access acepta acciones sin paciente concreto (listados).
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

revoke execute on function public.get_intake(uuid), public.list_pending_assessments() from anon, public;
grant execute on function public.get_intake(uuid), public.list_pending_assessments() to authenticated, service_role;
