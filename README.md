# NoBack

Programa médico digital de salud metabólica: perder grasa conservando el músculo, con dos rutas clínicas (con y sin fármaco), mantenimiento estructurado y un agente de IA por WhatsApp como primera capa. Nombre provisional. Servicio de Longevidad y Salud 360.

## Stack

- Next.js 16 (App Router, TypeScript) en Vercel, región `fra1`.
- Supabase (Postgres con RLS, Auth con doble factor) en Fráncfort.
- Tests: Vitest; la seguridad de la base de datos se prueba contra un Postgres 16 real.

## Estructura

```
src/
  app/            páginas: web pública, /acceso, /acceso/doble-factor, /clinica, /paciente
  lib/access.ts   reglas de a dónde puede ir cada rol (probadas en access.test.ts)
  lib/supabase/   clientes de Supabase (servidor y navegador)
  proxy.ts        refresca la sesión y protege las áreas privadas
supabase/
  migrations/     esquema, RLS, auditoría e inmutabilidad
tests/db/         tests de RLS: un paciente no ve a otro, el personal necesita doble factor…
.github/workflows ci.yml (lint, tipos, tests, build) · db-deploy.yml (migraciones a Supabase)
```

## Desarrollo local

```bash
npm ci
cp .env.example .env.local     # rellena las variables de Supabase
npm run dev
```

Tests de base de datos: necesitan un Postgres 16 en `TEST_DATABASE_URL`. Cada ejecución crea una base de datos temporal, aplica `tests/db/supabase-stub.sql` (réplica mínima de Supabase) y todas las migraciones, y la borra al terminar.

```bash
npm test
```

## Despliegue

- **Base de datos:** al fusionar en `main` un cambio en `supabase/migrations`, GitHub Actions aplica las migraciones (secretos `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`).
- **Aplicación:** Vercel despliega cada push; cada pull request tiene su vista previa. Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Alta del personal clínico

1. Crear el usuario en Supabase (Authentication → Users → Add user) con contraseña segura.
2. Asignar el rol con el editor SQL (como `postgres`):
   ```sql
   select set_config('request.jwt.claims', '{"role":"service_role"}', true);
   update public.profiles set role = 'doctor', first_name = '…', last_name = '…' where id = '<uuid>';
   ```
3. En su primer acceso, la app le obliga a configurar el doble factor. Sin él no ve ningún dato.
