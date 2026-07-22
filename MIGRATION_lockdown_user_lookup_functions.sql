-- ============================================================================
-- Fix: permisos por defecto de get_user_by_email / get_user_by_phone
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-07-21): ninguna de las dos tenía REVOKE/GRANT
-- explícito (ver register_client_function.sql), así que quedaban con el
-- EXECUTE que Postgres otorga a PUBLIC por defecto — cualquiera con la anon
-- key podía resolver email/teléfono → user_id + role, sin autenticarse
-- (enumeración de cuentas).
--
-- get_user_by_email: código muerto — no hay ningún call site en la app
-- (find_user_by_email, con lógica equivalente + fallback a auth.users, es la
-- que usa wizard/actions.ts). Se revoca por completo, sin volver a otorgar.
--
-- get_user_by_phone: SÍ se usa (wizard/actions.ts, registerOrVerifyClient,
-- paso pre-auth para detectar cliente existente por teléfono). Necesita
-- seguir siendo ejecutable por anon — se deja explícito, mismo patrón que
-- find_user_by_email, en vez de depender del default de PUBLIC.
-- ============================================================================

REVOKE ALL ON FUNCTION public.get_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_by_email(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_user_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_by_email(text) FROM service_role;

REVOKE ALL ON FUNCTION public.get_user_by_phone(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_by_phone(text) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- get_user_by_email no debe aparecer (0 filas); get_user_by_phone solo con
-- anon/authenticated/service_role:
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_name IN ('get_user_by_email', 'get_user_by_phone');
