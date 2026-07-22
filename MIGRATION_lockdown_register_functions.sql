-- ============================================================================
-- Lockdown de permisos: register_chef y register_client
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-07-21): ninguna de las dos tenía REVOKE/GRANT
-- explícito, así que quedaban con el privilegio EXECUTE que Postgres otorga
-- a PUBLIC por defecto en toda función nueva. Resultado: cualquiera con la
-- anon key podía llamarlas directo vía supabase.rpc(), pasando el user_id de
-- OTRA persona (ninguna de las dos valida p_user_id contra auth.uid()) y
-- pisarle nombre/teléfono/rol en public.users y auth.users. En el caso de
-- register_chef, además fuerza role='chef' sobre cualquier cuenta existente.
--
-- Por qué no se valida auth.uid() adentro (como sí hace save_chef_payout_account):
-- register_client se invoca con cuentas recién creadas por admin.createUser,
-- ANTES de que exista una sesión propia — auth.uid() sería NULL en ese punto.
-- La única forma correcta de cerrar esto es que ambas funciones dejen de ser
-- alcanzables por anon/authenticated y se llamen con el cliente admin
-- (service-role) desde el server action, que ya validó la identidad al hacer
-- signUp / admin.createUser en el mismo request.
--
-- Ver cambios de código asociados en:
--   src/app/auth/actions.ts    (register_chef)
--   src/app/wizard/actions.ts  (register_client)
-- ============================================================================

REVOKE ALL ON FUNCTION public.register_chef(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_chef(uuid, text, text, text, text, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.register_chef(uuid, text, text, text, text, text, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.register_chef(uuid, text, text, text, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.register_client(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_client(uuid, text, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.register_client(uuid, text, text, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.register_client(uuid, text, text, text, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe aparecer únicamente service_role para ambas funciones:
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_name IN ('register_chef', 'register_client');
