-- ============================================================================
-- MIGRACIÓN · rating_avg sin DEFAULT — "no hay promedio sin reseñas"
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-10-13): en prod, chef_profiles.rating_avg tiene
-- DEFAULT 0.00. No está versionado en ningún .sql del repo (create_tables.sql
-- declara `rating_avg NUMERIC` sin default) → se agregó a mano en el Dashboard.
--
-- Efecto: todo chef que se registra nace con rating_avg = 0.00 y rating_count = 0,
-- mientras que los chefs anteriores al backfill de MIGRATION_rating_count.sql
-- quedaron en NULL (recompute_chef_stats() devuelve NULL sin reseñas). En prod
-- había 4 chefs así (registrados entre ago y oct 2026).
--
-- No se ve en la UI (las estrellas se gatean por rating_count), pero los
-- listados públicos ordenan `rating_avg DESC NULLS LAST`
-- (MIGRATION_public_listing_qualification.sql): 0.00 queda ANTES que NULL, así
-- que los chefs nuevos sin reseñas salían por delante de los viejos sin reseñas.
--
-- Fix:
--   1) Quitar el DEFAULT → los chefs nuevos nacen con rating_avg NULL.
--   2) Limpiar los que ya nacieron con el default (solo filas sin reseñas).
-- recompute_chef_stats() (trigger trg_reviews_recompute) sigue poniendo el
-- promedio real en cuanto llega la primera reseña. No se toca nada más.
--
-- Idempotente: se puede re-correr sin efecto.
-- ============================================================================

ALTER TABLE public.chef_profiles
  ALTER COLUMN rating_avg DROP DEFAULT;

UPDATE public.chef_profiles
SET    rating_avg = NULL
WHERE  rating_count = 0
  AND  rating_avg IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — correr después de aplicar la migración.
-- ═══════════════════════════════════════════════════════════════════════════
-- Debe devolver default_columna = NULL y chefs_promedio_sin_resenas = 0:
--   SELECT
--     (SELECT column_default FROM information_schema.columns
--       WHERE table_schema='public' AND table_name='chef_profiles'
--         AND column_name='rating_avg')                          AS default_columna,
--     (SELECT count(*) FROM public.chef_profiles
--       WHERE rating_count = 0 AND rating_avg IS NOT NULL)       AS chefs_promedio_sin_resenas;
