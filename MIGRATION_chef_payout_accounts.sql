-- ============================================================================
-- MIGRACIÓN · Datos bancarios del chef (chef_payout_accounts)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Tabla SEPARADA de chef_profiles a propósito: chef_profiles tiene un SELECT
-- público (chef_profiles_public_read → USING true), así que cualquier dato puesto
-- ahí sería world-readable. Los datos bancarios son SENSIBLES, así que viven acá
-- con RLS estrictas:
--   · el chef hace SELECT / INSERT / UPDATE SOLO de su propia fila
--   · NO hay lectura pública ni para anon ni para otros chefs
--   · el admin lee todas las filas vía service-role (bypassa RLS)
--
-- 1:1 con el chef (chef_id es PK). El editor del lado del chef se agrega en una
-- entrega aparte; por ahora la tabla queda lista y el admin la lee en su panel.
-- ============================================================================

-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.chef_payout_accounts (
  chef_id        uuid PRIMARY KEY REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  account_holder text,                 -- titular de la cuenta
  bank_name      text,                 -- banco
  account_number text,                 -- número de cuenta (DATO SENSIBLE)
  account_type   text,                 -- ahorro / corriente / etc.
  document_id    text,                 -- cédula / documento del titular
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 2. Privilegios de tabla — anon SIN acceso; authenticated gateado por RLS.
REVOKE ALL ON public.chef_payout_accounts FROM PUBLIC, anon;
GRANT  SELECT, INSERT, UPDATE ON public.chef_payout_accounts TO authenticated;
GRANT  ALL ON public.chef_payout_accounts TO service_role;

-- 3. RLS: solo la propia fila del chef. El admin (service-role) bypassa todo.
ALTER TABLE public.chef_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_payout_select_own ON public.chef_payout_accounts
  FOR SELECT
  USING (chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

CREATE POLICY chef_payout_insert_own ON public.chef_payout_accounts
  FOR INSERT
  WITH CHECK (chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

CREATE POLICY chef_payout_update_own ON public.chef_payout_accounts
  FOR UPDATE
  USING      (chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()));

-- (Sin política de SELECT pública ni de DELETE: default-deny para todo lo demás.)

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional)
-- ─────────────────────────────────────────────────────────────────────────────
-- Políticas creadas:
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='chef_payout_accounts';
--
-- anon NO debe tener ningún privilegio:
--   SELECT privilege_type FROM information_schema.role_table_grants
--   WHERE table_name='chef_payout_accounts' AND grantee='anon';
