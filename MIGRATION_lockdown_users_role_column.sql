-- ============================================================================
-- MIGRACIÓN CRÍTICA · Blindaje de public.users.role (y demás columnas sensibles)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-07-21): la policy "Users can update their own
-- profile" ON public.users FOR UPDATE USING (auth.uid() = id) no restringe
-- columnas (Postgres no tiene RLS por columna), y nunca hubo un GRANT UPDATE
-- acotado para esta tabla (a diferencia de chef_profiles, que sí se blindó en
-- MIGRATION_admin_block_chef.sql para admin_blocked). Resultado: cualquier
-- usuario autenticado podía hacer, directo contra la REST API con su propio
-- JWT — sin pasar por ninguna función —:
--
--   PATCH /rest/v1/users?id=eq.<su-propio-id>
--   Body: {"role": "admin"}
--
-- y quedar con role='admin' de verdad en la base. Como el layout de /admin y
-- las RPCs admin confían en ese mismo campo leído server-side, esto era una
-- escalada de privilegios completa al panel de admin (no un engaño de UI: el
-- dato real cambiaba).
--
-- Columnas verificadas contra el código (único lugar que hace update directo
-- de esta tabla: src/app/dashboard/configuracion/actions.ts y
-- src/app/client-dashboard/configuracion/actions.ts, función saveNombre):
-- SOLO tocan first_name, first_surname, second_surname, updated_at. Ningún
-- otro archivo hace .from('users').update(...) — el resto de las mutaciones
-- pasa por register_chef/register_client (ya restringidas a service_role).
--
-- Por eso el GRANT se acota a exactamente esas 4 columnas — cualquier
-- necesidad futura de editar otro campo (phone, avatar_url, etc.) debe pasar
-- por una función SECURITY DEFINER dedicada, no por ampliar este GRANT.
-- ============================================================================

REVOKE UPDATE ON public.users FROM anon, authenticated;

GRANT UPDATE (
  first_name, first_surname, second_surname, updated_at
) ON public.users TO authenticated;

-- service_role conserva UPDATE completo (no fue revocado).

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe listar solo las 4 columnas para 'authenticated':
--   SELECT grantee, column_name, privilege_type
--   FROM information_schema.column_privileges
--   WHERE table_name = 'users' AND privilege_type = 'UPDATE'
--   ORDER BY grantee, column_name;
--
-- Prueba negativa (debe fallar con "permission denied for column role"):
--   -- logueado como un usuario cualquiera, vía anon key + su JWT:
--   PATCH .../rest/v1/users?id=eq.<su-id>  { "role": "admin" }
--
-- Prueba positiva (debe seguir funcionando): guardar nombre en
-- /dashboard/configuracion y /client-dashboard/configuracion.
