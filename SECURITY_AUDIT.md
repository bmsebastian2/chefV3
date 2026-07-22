# Auditoría de seguridad — 2026-07-21

Auditoría de solo lectura del repo y la capa de datos de Supabase (secrets, datos
personales en `.sql`, funciones `SECURITY DEFINER` + sus `GRANT`, políticas RLS
de las tablas sensibles, y superficie pública de claves privadas). Disparada por
preocupación sobre qué exponían los `.sql` versionados en el repo.

Metodología: grep/lectura estática de todos los `.sql` y el código fuente,
`git log --all -p` completo buscando secrets en el historial, y — para las
políticas RLS reales de `service_requests`/`payments`, nunca versionadas — una
consulta a `pg_policies` corrida manualmente en el SQL Editor de Supabase y
pegada acá para análisis (no tengo acceso directo a la base).

## Resultado del barrido inicial (sin hallazgos)

- **Secrets**: ninguna credencial hardcodeada en el código actual ni en todo el
  historial de git (búsqueda de patrones de JWT/API keys de Resend, dLocalGo,
  PayPal, VAPID, AWS, Slack, Google, GitHub — cero matches reales).
- **`.env*`**: nunca trackeado por git, correctamente en `.gitignore`.
- **Datos personales en `.sql`**: ningún archivo de migración tiene `INSERT`/
  `VALUES` con filas de datos reales — todos son DDL/funciones, sin seeds.
- **`SUPABASE_SERVICE_ROLE_KEY` / `VAPID_PRIVATE_KEY`**: confirmado que solo se
  usan en archivos server-only (`src/utils/supabase/admin.ts`,
  `src/app/api/push/send/route.ts`), ninguno con `'use client'`.

## Hallazgos y fixes aplicados

| # | Severidad | Hallazgo | Fix | Migración |
|---|-----------|----------|-----|-----------|
| 1 | 🔴 Crítico | `register_chef`/`register_client` (SECURITY DEFINER) sin `REVOKE`/`GRANT` explícito → ejecutables por `PUBLIC` (default de Postgres). Confían en `p_user_id` como parámetro sin validar `auth.uid()`. Encadenado con `find_user_by_email` (anon), cualquiera podía resolver el `user_id` de una víctima y llamar `register_chef` para pisarle nombre/teléfono y **forzar `role='chef'`** sobre su cuenta. | Restringidas a `service_role`; las dos únicas llamadas (`src/app/auth/actions.ts`, `src/app/wizard/actions.ts`) movidas al cliente admin server-side. | `MIGRATION_lockdown_register_functions.sql` |
| 2 | 🔴 Crítico | `public.users.role` autoescalable: la policy de `UPDATE` (`auth.uid() = id`) no restringe columnas, y nunca hubo `GRANT UPDATE` acotado (a diferencia de `chef_profiles.admin_blocked`, que sí tiene ese blindaje). Cualquier usuario autenticado podía `PATCH .../rest/v1/users` con `{"role":"admin"}` directo, sin pasar por ninguna función, y quedar admin de verdad. | Columna blindada: `REVOKE UPDATE` + `GRANT UPDATE` acotado a las 4 columnas que el código realmente autoedita (`first_name`, `first_surname`, `second_surname`, `updated_at`, verificadas contra `dashboard/configuracion/actions.ts` y `client-dashboard/configuracion/actions.ts`). Probado en producción: guardar nombre en ambos dashboards sigue funcionando. | `MIGRATION_lockdown_users_role_column.sql` |
| 3 | 🟠 Medio | Policy `push_subscriptions_service_role_read` (`USING (true)`) sin cláusula `TO service_role` → cualquier usuario autenticado podía leer **todas** las suscripciones push de **todos** los usuarios (endpoint, `p256dh`, `auth`) vía REST directo, no solo las propias. | Recreada con `TO service_role`. Verificado que `/api/push/send` ya usaba el cliente admin, sin cambios de código necesarios. | `MIGRATION_push_subscriptions_service_role_policy.sql` |
| 4 | 🟠 Medio | Enumeración de cuentas: `get_user_by_email`/`get_user_by_phone` sin `GRANT`/`REVOKE` explícito (default `PUBLIC`). `get_user_by_email` resultó código muerto (sin call sites). | `get_user_by_email` bloqueada por completo (revocada de todos los roles). `get_user_by_phone` explícita a `anon, authenticated, service_role` (la sigue necesitando el wizard pre-auth, mismo patrón que `find_user_by_email`). | `MIGRATION_lockdown_user_lookup_functions.sql` |
| 5 | 🟠 Medio | Policies huérfanas en `service_requests`: `select_service_requests` dejaba a **cualquier cuenta chef** leer el 100% de las solicitudes de clientes (evento, ciudad, presupuesto) vía REST directo, sin filtro de matching. `requests_public_insert` permitía INSERT sin restricción (`with_check=true`, rol `public`) — cualquiera sin sesión podía insertar filas arbitrarias evitando la RPC `create_service_request`. Confirmado que ningún flujo legítimo usa ninguna de las tres (el listado real sale de RPCs `SECURITY DEFINER`; el detalle de request en `dashboard/requests/[id]/page.tsx` ya usa el cliente admin porque asumía que RLS bloqueaba la lectura directa). | Las 3 policies dropeadas. Quedan solo `cliente ve sus solicitudes` (propia fila + admin) y `cliente actualiza sus solicitudes` (propia fila, solo clientes). Verificado por consulta a `pg_policies` que solo quedan esas 2. | `MIGRATION_drop_orphan_service_requests_policies.sql` |
| 6 | 🟢 Bajo | `service_requests`/`payments` sin su `ENABLE ROW LEVEL SECURITY` ni políticas versionadas en el repo (se crearon directo en el Dashboard). No se trató como vulnerabilidad activa — hay evidencia indirecta fuerte de que ya tenían RLS activo. | Documentadas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (no-op si ya estaba activo) + transcripción exacta de las policies reales de `payments` y de las 2 legítimas de `service_requests` (post-fix #5). | `MIGRATION_baseline_rls_safety_net.sql` |

## Migraciones — orden de ejecución

Todas corridas en Supabase (SQL Editor) en este orden:

1. `MIGRATION_lockdown_users_role_column.sql`
2. `MIGRATION_lockdown_register_functions.sql`
3. `MIGRATION_push_subscriptions_service_role_policy.sql`
4. `MIGRATION_lockdown_user_lookup_functions.sql`
5. `MIGRATION_baseline_rls_safety_net.sql`
6. `MIGRATION_drop_orphan_service_requests_policies.sql` (debe correr **después** de la 5 — la 5 documenta las policies que la 6 dropea; si se invierte el orden, la 5 las resucita)

## Verificación realizada

- Registro de chef y de cliente probado end-to-end (reproducción automatizada con Playwright contra un dev server limpio, más prueba manual del usuario) tras el fix #1 — sin errores, redirect correcto a `/dashboard`.
- Guardar nombre en `/dashboard/configuracion` y `/client-dashboard/configuracion` probado tras el fix #2.
- `pg_policies` de `service_requests` confirmado con solo 2 filas tras el fix #5.
- Type-check completo del proyecto (`tsc --noEmit`) y `npm run lint` sin errores nuevos introducidos por los cambios de código (`src/app/auth/actions.ts`, `src/app/wizard/actions.ts`).

## Notas para futuras auditorías

- El patrón correcto para mutaciones sensibles en este proyecto es `SECURITY
  DEFINER` + `REVOKE ALL FROM PUBLIC` + `GRANT` explícito al rol mínimo
  necesario — nunca depender del default de Postgres (`PUBLIC` obtiene
  `EXECUTE` en funciones nuevas salvo que se revoque). Ver
  `save_chef_payout_account` (deriva el dueño de `auth.uid()`) y
  `get_all_payments_admin` (restringida a `service_role`) como referencia de
  cómo sí está bien hecho.
- Para tablas con RLS, Postgres no filtra por columna — si una policy de
  `UPDATE` permite tocar la fila propia, cualquier columna es editable salvo
  que se blinde aparte con `GRANT UPDATE (columnas...)` (patrón usado en
  `chef_profiles.admin_blocked` y ahora también en `users.role`). Antes de
  agregar una columna sensible a una tabla con policy de "editar mi propia
  fila", verificar si necesita el mismo blindaje.
- `service_requests` y `payments` siguen sin tener su `CREATE TABLE` original
  versionado en el repo (se crearon en el Dashboard). El baseline de RLS ya
  quedó documentado; falta el DDL completo si se quiere reproducir el schema
  desde cero.
- Ítem pendiente fuera del código, a cargo del usuario: confirmar que el repo
  de GitHub sea y haya sido siempre privado — si alguna vez fue público, tratar
  las credenciales de esa época como comprometidas y rotarlas.
