-- ============================================================================
-- MIGRACIÓN · RLS de lectura para que el cliente vea sus propias facetas
-- (restricciones, momentos de comida, resumen semanal) en su card de solicitud
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Contexto: request_restrictions / request_dates / weekly_meal_details nunca
-- tuvieron una policy de SELECT para el cliente dueño de la solicitud. Hasta
-- ahora solo se escribían vía RPC SECURITY DEFINER (insert_request_dates,
-- insert_weekly_meal_details, etc. — no dependen de RLS) y se leían del lado
-- chef vía get_chef_requests_state(), también SECURITY DEFINER. El único
-- camino que necesita RLS propio es la lectura DIRECTA que ahora hace
-- client-dashboard/RequestCard.tsx vía PostgREST embed — y ese camino nunca
-- tuvo policy, por eso el chef ve las restricciones y el cliente no.
--
-- Alcance de la policy: SOLO el dueño de la solicitud (auth.uid() =
-- service_requests.user_id) puede leer sus propias filas. No se toca ninguna
-- policy existente — esto es puramente aditivo (las policies RLS son OR entre
-- sí), así que no puede reducir acceso que ya funcionaba en otro lado.
-- ============================================================================

ALTER TABLE public.request_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_dates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_meal_details  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente ve restricciones de sus solicitudes" ON public.request_restrictions;
CREATE POLICY "cliente ve restricciones de sus solicitudes" ON public.request_restrictions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = request_restrictions.request_id
      AND sr.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cliente ve fechas de sus solicitudes" ON public.request_dates;
CREATE POLICY "cliente ve fechas de sus solicitudes" ON public.request_dates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = request_dates.request_id
      AND sr.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cliente ve detalle semanal de sus solicitudes" ON public.weekly_meal_details;
CREATE POLICY "cliente ve detalle semanal de sus solicitudes" ON public.weekly_meal_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = weekly_meal_details.request_id
      AND sr.user_id = auth.uid()
  )
);

-- GRANT de tabla (ACL) separado de la policy (fila) — este proyecto ya se
-- quedó pegado antes por tener uno sin el otro (ver notas de get_active_chefs_for_map
-- y chef_photos). Sin este GRANT, la policy de arriba no alcanza: PostgREST
-- necesita permiso a nivel tabla ANTES de evaluar RLS fila por fila.
GRANT SELECT ON public.request_restrictions TO authenticated;
GRANT SELECT ON public.request_dates        TO authenticated;
GRANT SELECT ON public.weekly_meal_details  TO authenticated;
