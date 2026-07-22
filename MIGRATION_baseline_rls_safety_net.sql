-- ============================================================================
-- Safety-net + documentación versionada: RLS de service_requests y payments
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hallazgo (auditoría 2026-07-21): ninguna de las dos tablas tenía su
-- ENABLE ROW LEVEL SECURITY ni sus CREATE POLICY versionados en el repo — se
-- crearon directo en el Dashboard. Esto NO se trata como vulnerabilidad activa
-- (las policies reales, abajo, confirman que RLS está encendido en ambas).
--
-- Las policies de esta migración son una transcripción EXACTA de las que ya
-- corren en producción (consulta a pg_policies, 2026-07-21) — el DROP+CREATE
-- es un no-op funcional, solo las deja versionadas. No se cambia ningún
-- comportamiento acá.
--
-- NOTA: la consulta original también encontró "select_service_requests",
-- "requests_public_insert" y "solo clientes insertan solicitudes" en
-- service_requests — las tres resultaron huérfanas (ningún flujo legítimo
-- las usa) y más permisivas de lo necesario. Se dropean aparte en
-- MIGRATION_drop_orphan_service_requests_policies.sql, con el detalle de por
-- qué. A propósito NO se transcriben acá, para no resucitarlas si esta
-- migración se corre después de esa. Correr esta ANTES que aquella.
-- ============================================================================

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;

-- ── payments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users ven sus pagos" ON public.payments;
CREATE POLICY "Users ven sus pagos" ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── service_requests ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cliente actualiza sus solicitudes" ON public.service_requests;
CREATE POLICY "cliente actualiza sus solicitudes" ON public.service_requests
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
  );

DROP POLICY IF EXISTS "cliente ve sus solicitudes" ON public.service_requests;
CREATE POLICY "cliente ve sus solicitudes" ON public.service_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
--   SELECT tablename, policyname, roles, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('service_requests', 'payments')
--   ORDER BY tablename, policyname;
