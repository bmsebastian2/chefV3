-- ============================================================================
-- MIGRACIÓN · Prompt de "crear contraseña" en el primer ingreso del wizard
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Contexto: cuando un cliente se crea desde el wizard sin elegir contraseña
-- (caso de hoy: siempre), se le asigna una password random que nunca ve ni
-- conoce — solo puede entrar por el magic link del email. Esta migración
-- agrega el flag para ofrecerle, una única vez, crear una contraseña propia.
--
-- password_set = true  → no corresponde mostrar el prompt (default: cubre
--                         chefs, OAuth y cualquier fila existente/futura que
--                         no pase explícitamente por la rama de password
--                         random del wizard).
-- password_set = false → se pone explícitamente solo en esa rama
--                         (src/app/wizard/actions.ts, registerOrVerifyClient).
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_set boolean NOT NULL DEFAULT true;

-- ── RPC para que el usuario autenticado marque el flag ──────────────────────
-- 🔒 Sin parámetro de user_id: se deriva de auth.uid() adentro de la función,
-- igual que save_chef_payout_account. Así un usuario solo puede marcar SU
-- propia fila, nunca la de otro. Se llama tanto si el usuario crea una
-- contraseña propia como si elige seguir con magic link — en los dos casos
-- el prompt no debe volver a aparecer.
CREATE OR REPLACE FUNCTION public.mark_password_set()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
     SET password_set = true,
         updated_at   = now()
   WHERE id = auth.uid();
END;
$$;

REVOKE ALL     ON FUNCTION public.mark_password_set() FROM PUBLIC;

-- Solo el usuario autenticado. NADA de service_role: esta función deriva su
-- dueño de auth.uid(), que con service-role es NULL → siempre fallaría.
GRANT EXECUTE  ON FUNCTION public.mark_password_set() TO authenticated;

-- ── RPC para que registerOrVerifyClient marque password_set = false ────────
-- Se llama con el admin client (service_role) en el mismo momento que
-- register_client — el usuario todavía no tiene sesión propia, así que no
-- existe auth.uid() (a diferencia de mark_password_set de arriba). Por eso
-- SÍ recibe p_user_id por parámetro, igual que register_client.
--
-- 🔒 Verificado contra la base: public.users nunca tuvo un GRANT UPDATE
-- explícito para service_role (el REVOKE de MIGRATION_lockdown_users_role_
-- column.sql solo tocó anon/authenticated, pero el privilegio para
-- service_role tampoco existía de entrada — un UPDATE directo desde el admin
-- client falla con 42501 "permission denied for table users"). Se resuelve
-- con un RPC dedicado, mismo patrón que register_client/register_chef, en
-- lugar de agregar un GRANT UPDATE de tabla completa para service_role.
CREATE OR REPLACE FUNCTION public.mark_password_unset(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
     SET password_set = false,
         updated_at   = now()
   WHERE id = p_user_id;
END;
$$;

REVOKE ALL     ON FUNCTION public.mark_password_unset(uuid) FROM PUBLIC;
REVOKE ALL     ON FUNCTION public.mark_password_unset(uuid) FROM authenticated;
REVOKE ALL     ON FUNCTION public.mark_password_unset(uuid) FROM anon;
GRANT EXECUTE  ON FUNCTION public.mark_password_unset(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- La columna existe con default true:
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name = 'password_set';
--
-- Las dos funciones existen y son SECURITY DEFINER (prosecdef debe ser true):
--   SELECT proname, prosecdef FROM pg_proc
--   WHERE proname IN ('mark_password_set', 'mark_password_unset');
--
-- Privilegios (mark_password_set → solo authenticated;
-- mark_password_unset → solo service_role; NO debe aparecer anon ni public
-- en ninguna de las dos):
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_name IN ('mark_password_set', 'mark_password_unset');
