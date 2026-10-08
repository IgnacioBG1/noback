# Guía para agentes y desarrolladores de NoBack

- **Next.js 16**: tiene cambios incompatibles con versiones anteriores (`proxy.ts` sustituye a `middleware.ts`; `params`, `searchParams` y `cookies()` son asíncronos). Antes de usar una API, consulta `node_modules/next/dist/docs/`.
- **Idioma**: textos de la interfaz en español de España. Nada de textos de prueba.
- **Seguridad primero**: toda tabla nueva lleva RLS, la política restrictiva `staff_requires_aal2` y tests en `tests/db`. Las lecturas de historia clínica por el personal pasan por funciones que llaman a `app.log_access()` en la misma transacción.
- **Nunca** se borra ni se sobrescribe un dato clínico: las correcciones son registros nuevos.
- **Publicidad**: ni la web ni los textos mencionan medicamentos (marca o principio activo).
- **Agente de IA**: no interpreta datos clínicos ni da consejo clínico; escala al médico.
- **Datos**: solo pacientes ficticios fuera de producción.
- **Comprobaciones antes de subir**: `npm run lint && npm run typecheck && npm test && npm run build`.
