-- ============================================================================
-- MIGRACIÓN · Bloqueo administrativo de chefs
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Crea un estado de bloqueo de NIVEL ADMIN, SEPARADO de is_active.
--   · is_active  → lo controla el chef (completitud de perfil). NO se toca.
--   · admin_blocked → lo controla SOLO el admin. Gana siempre.
--   Regla de "puede trabajar": is_active = true AND admin_blocked = false.
--
-- BLINDAJE (lo crítico): la RLS de chef_profiles deja al chef hacer UPDATE de su
-- propia fila sobre CUALQUIER columna (políticas chef_profiles_owner_write /
-- "chef edita su propio perfil"). Postgres no tiene RLS por-columna, así que para
-- que el chef NO pueda revertir su bloqueo usamos privilegios a NIVEL DE COLUMNA:
-- se revoca UPDATE del rol authenticated y se vuelve a otorgar solo sobre las
-- columnas legítimas — las 4 columnas admin quedan afuera. El admin escribe vía
-- la RPC set_chef_block (SECURITY DEFINER, owner = postgres → ignora estos privi-
-- legios de columna).
-- ============================================================================

-- 1. Columnas de bloqueo (idempotente)
ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS admin_blocked      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_block_reason text,
  ADD COLUMN IF NOT EXISTS admin_blocked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS admin_blocked_by   uuid;

-- 2. Blindaje por privilegios de columna
--    Revocamos el UPDATE amplio y re-otorgamos SOLO las 22 columnas que el chef
--    edita hoy. Las 4 columnas admin_* NO se otorgan → un .update() del chef que
--    las toque falla con "permission denied for column".
REVOKE UPDATE ON public.chef_profiles FROM anon, authenticated;

GRANT UPDATE (
  id, user_id, tagline, acerca_de_mi, para_mi_cocinar_es, aprendi_a_cocinar,
  mi_secreto_cocina, sitio_web, instagram, facebook, youtube, linkedin,
  city, country, experience_years, rating_avg, total_services,
  is_active, is_pro, created_at, updated_at, preferred_language
) ON public.chef_profiles TO authenticated;

-- service_role conserva UPDATE completo (no fue revocado) para el admin client.

-- 3. RPC admin-only para fijar/levantar el bloqueo.
--    SECURITY DEFINER (owner postgres) → puede escribir las columnas admin_*
--    aunque authenticated no pueda. El id del admin se pasa explícito porque el
--    admin opera con service-role (auth.uid() es NULL en ese contexto).
CREATE OR REPLACE FUNCTION public.set_chef_block(
  p_chef_id  uuid,
  p_blocked  boolean,
  p_reason   text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chef_profiles
  SET
    admin_blocked      = p_blocked,
    admin_block_reason = CASE WHEN p_blocked THEN NULLIF(btrim(p_reason), '') ELSE NULL END,
    admin_blocked_at   = CASE WHEN p_blocked THEN now()      ELSE NULL END,
    admin_blocked_by   = CASE WHEN p_blocked THEN p_admin_id ELSE NULL END,
    updated_at         = now()
  WHERE id = p_chef_id;
END;
$$;

REVOKE ALL    ON FUNCTION public.set_chef_block(uuid, boolean, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_chef_block(uuid, boolean, text, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional)
-- ─────────────────────────────────────────────────────────────────────────────
-- Columnas creadas:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='chef_profiles' AND column_name LIKE 'admin_%';
--
-- Privilegios de columna del rol authenticated (NO debe aparecer admin_blocked):
--   SELECT column_name, privilege_type FROM information_schema.column_privileges
--   WHERE table_name='chef_profiles' AND grantee='authenticated' AND privilege_type='UPDATE'
--   ORDER BY column_name;
--
-- Probar el blindaje (debería FALLAR con permission denied si lo corrés como el chef):
--   UPDATE chef_profiles SET admin_blocked = false WHERE id = '<algún-chef>';
