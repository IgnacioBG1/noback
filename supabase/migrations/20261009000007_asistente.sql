-- NoBack · Bloque 5 · Asistente (WhatsApp y chat web), check-ins de un toque y mensajes escalados.
-- Reglas (decisiones regulatorias): el asistente no interpreta datos clínicos ni valora urgencias. Todo lo
-- que parezca clínico se reenvía literal al médico (escalado) con un mensaje fijo de «112 si es urgente».
-- Los mensajes y escalados son historia del paciente: inmutables (salvo el estado del escalado) y auditados.

-- ─────────────────────────── Canal del paciente ───────────────────────────
create table public.patient_channels (
  patient_id         uuid primary key references public.profiles (id) on delete restrict,
  phone_enc          text,                          -- AES-256-GCM en la aplicación
  phone_hash         text unique,                   -- HMAC-SHA256 del número normalizado, para buscar al recibir
  phone_last4        text check (phone_last4 ~ '^[0-9]{4}$'),
  whatsapp_opt_in_at timestamptz,                -- cuando el paciente vinculó su WhatsApp con el código
  link_code_hash     text unique,                   -- código de vinculación de un solo uso (hash), enviado desde su WhatsApp
  link_code_expires  timestamptz,
  reminders_enabled  boolean not null default true,
  reminder_hour      smallint not null default 9 check (reminder_hour between 6 and 22),
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────── Mensajes ───────────────────────────
create table public.messages (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles (id) on delete restrict,
  channel        text not null check (channel in ('whatsapp', 'web')),
  direction      text not null check (direction in ('in', 'out')),
  sender         text not null check (sender in ('patient', 'agent', 'staff', 'system')),
  staff_id       uuid references public.profiles (id) on delete restrict,
  kind           text not null default 'text' check (kind in ('text', 'image', 'button', 'template')),
  body           text check (length(body) <= 4096),
  media_path     text,                              -- ruta en el bucket privado «comidas»
  meta           jsonb not null default '{}'::jsonb, -- botones ofrecidos, id de respuesta, estimación de la foto…
  wa_message_id  text unique,
  created_at     timestamptz not null default clock_timestamp(),
  check (sender <> 'staff' or staff_id is not null),
  check ((direction = 'in') = (sender = 'patient'))
);
create index messages_patient_idx on public.messages (patient_id, created_at desc);

-- ─────────────────────────── Escalados al equipo ───────────────────────────
create table public.escalations (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.profiles (id) on delete restrict,
  message_id   uuid not null references public.messages (id) on delete restrict,
  reason       text not null check (reason in ('clinico', 'peticion', 'no_entiende', 'malestar')),
  status       text not null default 'abierta' check (status in ('abierta', 'respondida', 'cerrada')),
  resolved_by  uuid references public.profiles (id) on delete restrict,
  resolved_at  timestamptz,
  created_at   timestamptz not null default clock_timestamp()
);
create index escalations_open_idx on public.escalations (status, created_at);

-- ─────────────────────────── Check-ins de un toque ───────────────────────────
create table public.checkins (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete restrict,
  kind        text not null check (kind in ('plan', 'entreno', 'animo')),
  value       text not null check (value in ('si', 'parcial', 'no', 'bien', 'regular', 'mal')),
  day         date not null default (now() at time zone 'Europe/Madrid')::date,
  message_id  uuid references public.messages (id) on delete restrict,
  created_at  timestamptz not null default clock_timestamp(),
  unique (patient_id, kind, day)
);

-- ─────────────────────────── Inmutabilidad ───────────────────────────
create trigger messages_immutable before update or delete on public.messages for each row execute function app.forbid_change();
create trigger messages_no_truncate before truncate on public.messages for each statement execute function app.forbid_change();
create trigger checkins_no_delete before delete on public.checkins for each row execute function app.forbid_change();

-- Del escalado solo cambia el estado; el resto queda fijo.
create or replace function app.guard_escalation() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los escalados no se borran (registro inmutable)';
  end if;
  if new.patient_id <> old.patient_id or new.message_id <> old.message_id or new.reason <> old.reason or new.created_at <> old.created_at then
    raise exception 'Del escalado solo se puede cambiar el estado';
  end if;
  if new.status <> 'abierta' and new.resolved_at is null then
    new.resolved_at := now();
    new.resolved_by := coalesce(new.resolved_by, auth.uid());
  end if;
  return new;
end
$$;
create trigger escalations_guard before update or delete on public.escalations for each row execute function app.guard_escalation();

-- ─────────────────────────── RLS ───────────────────────────
alter table public.patient_channels enable row level security;
alter table public.messages enable row level security;
alter table public.escalations enable row level security;
alter table public.checkins enable row level security;

do $$
declare t text;
begin
  foreach t in array array['patient_channels', 'messages', 'escalations', 'checkins'] loop
    execute format(
      'create policy staff_requires_aal2 on public.%I as restrictive for all to authenticated
         using (not app.is_staff() or app.is_aal2()) with check (not app.is_staff() or app.is_aal2())', t);
  end loop;
end
$$;

-- Canal: el paciente ve el suyo y cambia sus recordatorios. El número solo lo escribe el servidor al recibir
-- el código de vinculación desde ese WhatsApp (así se comprueba que el número es suyo).
create policy channels_own_select on public.patient_channels for select to authenticated
  using (patient_id = auth.uid());
create policy channels_own_update on public.patient_channels for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- Mensajes: pueden contener síntomas → paciente, su médico y admin (como la historia clínica).
create policy messages_select on public.messages for select to authenticated
  using (app.can_read_clinical(patient_id));
create policy messages_patient_in on public.messages for insert to authenticated
  with check (patient_id = auth.uid() and direction = 'in' and sender = 'patient' and channel = 'web');
create policy messages_staff_out on public.messages for insert to authenticated
  with check (sender = 'staff' and direction = 'out' and staff_id = auth.uid() and (app.is_admin() or app.is_assigned(patient_id, 'doctor')));

create policy escalations_select on public.escalations for select to authenticated
  using (app.can_read_clinical(patient_id));
create policy escalations_update on public.escalations for update to authenticated
  using (app.is_admin() or app.is_assigned(patient_id, 'doctor'))
  with check (app.is_admin() or app.is_assigned(patient_id, 'doctor'));

-- Check-ins (adherencia): también el entrenador.
create policy checkins_select on public.checkins for select to authenticated
  using (app.can_read_training(patient_id));

revoke all on public.patient_channels, public.messages, public.escalations, public.checkins from anon, authenticated;
grant select (patient_id, phone_last4, whatsapp_opt_in_at, reminders_enabled, reminder_hour, updated_at) on public.patient_channels to authenticated;
grant update (reminders_enabled, reminder_hour) on public.patient_channels to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.escalations, public.checkins to authenticated;
grant update (status) on public.escalations to authenticated;
grant select, insert, update on public.patient_channels, public.escalations, public.checkins to service_role;
grant select, insert on public.messages to service_role;

-- ─────────────────────────── Lecturas auditadas para el equipo ───────────────────────────
create or replace function public.get_conversation(p_patient uuid, p_limit integer default 100)
returns setof public.messages
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not app.can_read_clinical(p_patient) then
    raise exception 'Sin permiso para ver este paciente' using errcode = '42501';
  end if;
  if app.is_staff() and not app.is_aal2() then
    raise exception 'Se requiere doble factor' using errcode = '42501';
  end if;
  if p_patient <> auth.uid() then
    perform app.log_access(p_patient, 'ver_conversacion');
  end if;
  return query select * from (
    select * from public.messages where patient_id = p_patient order by created_at desc limit least(p_limit, 500)
  ) m order by m.created_at;
end
$$;

-- Bandeja de escalados: admin ve todos; el médico, los de sus pacientes. Incluye el texto literal.
create or replace function public.list_escalations(p_status text default 'abierta')
returns table (id uuid, patient_id uuid, first_name text, last_name text, reason text, status text,
               created_at timestamptz, body text, kind text, channel text, resolved_at timestamptz)
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not app.is_staff() or not app.is_aal2() then
    raise exception 'Solo para el equipo clínico con doble factor' using errcode = '42501';
  end if;
  perform app.log_access(null, 'listar_escalados');
  return query
    select e.id, e.patient_id, p.first_name, p.last_name, e.reason, e.status, e.created_at, m.body, m.kind, m.channel, e.resolved_at
    from public.escalations e
    join public.messages m on m.id = e.message_id
    left join lateral (select pr.first_name, pr.last_name from public.profiles pr where pr.id = e.patient_id) p on true
    where (p_status = 'todas' or e.status = p_status)
    order by e.created_at desc
    limit 200;
end
$$;

revoke execute on function public.get_conversation(uuid, integer), public.list_escalations(text) from anon, public;
grant execute on function public.get_conversation(uuid, integer), public.list_escalations(text) to authenticated;

-- ─────────────────────────── Fotos de comidas (Storage) ───────────────────────────
-- Bucket privado. Solo el servidor sube y firma URLs temporales (lectura auditada en la aplicación).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('comidas', 'comidas', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    on conflict (id) do nothing;
  end if;
end
$$;
