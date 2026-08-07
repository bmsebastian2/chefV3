-- ============================================================================
-- MIGRACIÓN · GRANT faltante en reviews — "permission denied for table reviews"
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo: create_reviews_table.sql creó la tabla y submit_review.sql agregó
-- la policy RLS "Reviews are publicly readable" (USING (true), sin cláusula
-- TO → pensada para aplicar a cualquier rol), pero ninguno de los dos otorgó
-- el GRANT de tabla. PostgREST necesita el GRANT a nivel de tabla ANTES de
-- evaluar RLS fila por fila (mismo patrón que ya golpeó a
-- request_restrictions/chef_photos antes, ver
-- MIGRATION_request_facets_client_rls.sql) — sin él, CUALQUIER lectura de
-- reviews devuelve 42501 "permission denied for table reviews", incluso con
-- la service-role key.
--
-- Alcance: anon + authenticated, igual que la policy (reviews está pensada
-- para mostrarse también en el perfil público del chef más adelante, no solo
-- en su dashboard).
-- ============================================================================

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe listar anon y authenticated con privilege_type = SELECT:
--   SELECT grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name = 'reviews';
