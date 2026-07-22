-- ============================================================================
-- Fix: policy "push_subscriptions_service_role_read" sin restricción de rol
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-07-21): la policy se creó con USING (true) pero
-- SIN cláusula "TO service_role" (ver push_subscriptions_migration.sql). En
-- RLS, una policy sin "TO" aplica a cualquier rol con GRANT de tabla —
-- Supabase por defecto da SELECT a nivel de tabla a `authenticated` — así que
-- cualquier usuario logueado podía leer TODAS las filas de push_subscriptions
-- de TODOS los usuarios (endpoint, p256dh, auth de cada suscripción push),
-- no solo las propias. La policy "push_subscriptions_owner" (auth.uid() =
-- user_id) seguía existiendo, pero en RLS basta con que UNA policy permita
-- el acceso para que se otorgue.
--
-- Fix: recrear la policy con el "TO service_role" que le faltaba, para que
-- solo el service-role client (usado en /api/push/send) pueda leer todas
-- las filas; cualquier otro rol sigue limitado a "push_subscriptions_owner".
-- ============================================================================

DROP POLICY IF EXISTS "push_subscriptions_service_role_read" ON push_subscriptions;

CREATE POLICY "push_subscriptions_service_role_read"
  ON push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe listar la policy con roles = {service_role}, no {public}:
--   SELECT policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE tablename = 'push_subscriptions';
