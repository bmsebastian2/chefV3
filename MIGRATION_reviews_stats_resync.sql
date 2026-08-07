-- ============================================================================
-- MIGRACIÓN · Resincronizar chef_profiles.rating_avg / rating_count / total_services
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de MIGRATION_reviews_grant.sql)
--
-- Hallazgo: el chef c52b33d4-924a-404c-94a6-b94eee41cef1 mostraba
-- rating_avg=4.88, rating_count=2, total_services=2 sin tener NINGÚN booking
-- ni review reales (reviews.chef_id para ese id devuelve 0 filas). Esos 3
-- campos quedaron stale — probablemente de una edición manual o de un reset
-- de datos que no pasó por DELETE (p.ej. TRUNCATE, que no dispara el trigger
-- FOR EACH ROW trg_reviews_recompute que normalmente mantiene esto al día).
--
-- Fix: volver a correr el mismo recompute_chef_stats() que ya usa el trigger,
-- para TODOS los chefs (no solo el afectado) — es idempotente: a un chef con
-- datos ya correctos no le cambia nada, y a cualquier otro con el mismo
-- problema lo deja consistente con sus reviews reales.
-- ============================================================================

SELECT public.recompute_chef_stats(cp.id) FROM public.chef_profiles cp;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Tu chef debe quedar en NULL / 0 / (bookings completados reales, hoy 0):
--   SELECT id, rating_avg, rating_count, total_services
--   FROM public.chef_profiles
--   WHERE id = 'c52b33d4-924a-404c-94a6-b94eee41cef1';
