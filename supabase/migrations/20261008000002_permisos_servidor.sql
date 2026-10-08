-- NoBack · Permisos explícitos del rol de servidor (service_role).
-- El proyecto se crea sin «exponer automáticamente las tablas nuevas», así que ningún rol recibe
-- privilegios por defecto. Aquí se conceden al servidor de forma explícita; RLS no le afecta (bypassrls),
-- pero los triggers de inmutabilidad sí.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Las tablas futuras de NoBack también las recibirá el servidor; anon y authenticated, nunca por defecto.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;
