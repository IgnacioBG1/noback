-- NoBack · Cerrar privilegios heredados de los valores por defecto de Supabase.
-- Supabase concede por defecto TRUNCATE, REFERENCES y TRIGGER a anon/authenticated en las tablas nuevas.
-- RLS no se aplica a TRUNCATE: un usuario autenticado podría vaciar una tabla entera. Se revocan.

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

-- Solo los privilegios que cada tabla necesita (RLS decide además qué filas):
revoke insert, update, delete on public.profiles, public.access_log from authenticated;
revoke update, delete on public.consents from authenticated;
revoke delete on public.enrollments, public.rights_requests from authenticated;
-- Revocar UPDATE de tabla también quita los permisos por columna: se vuelven a dar los del paciente.
grant update (first_name, last_name, birth_date, sex, dni_enc) on public.profiles to authenticated;

-- Valores por defecto para tablas futuras creadas por postgres: nada para anon/authenticated.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
