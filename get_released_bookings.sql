-- ============================================================================
-- Panel admin · Pagos liberados — get_released_bookings()
--
-- Devuelve el HISTÓRICO de payouts ya girados al chef (payout_status='released')
-- con todo lo necesario para el panel: identidad (chef + cliente), descripción
-- del servicio, montos (bruto/comisión/neto), moneda, fecha de liberación y la
-- referencia del giro manual.
--
-- La agrupación por mes, el promedio neto y el ranking de chef se calculan en TS
-- sobre este payload — la RPC solo entrega filas planas ordenadas por released_at.
--
-- Admin-only: SECURITY DEFINER (bypassa RLS) + REVOKE PUBLIC + GRANT a
-- service_role. Se invoca con el admin client desde /admin (ruta ya gateada por
-- el layout que exige users.role='admin'). Nunca expuesta a authenticated.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_released_bookings()
RETURNS TABLE (
  booking_id         uuid,
  chef_id            uuid,
  chef_name          text,
  client_name        text,
  client_email       text,
  service_type       text,
  occasion           text,
  city               text,
  total_amount       numeric,
  commission_amount  numeric,
  chef_payout_amount numeric,
  currency           text,
  completed_at       timestamptz,
  released_at        timestamptz,
  payout_ref         text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.chef_id,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.first_surname)), ''),
      'Chef'
    )                                   AS chef_name,
    COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente') AS client_name,
    ci.email                            AS client_email,
    sr.service_type,
    sr.occasion,
    sr.city,
    b.total_amount,
    b.commission_amount,
    b.chef_payout_amount,
    b.currency,
    b.completed_at,
    b.released_at,
    b.payout_ref
  FROM public.bookings b
  LEFT JOIN public.chef_profiles cp      ON cp.id = b.chef_id
  LEFT JOIN public.users cu              ON cu.id = cp.user_id
  LEFT JOIN public.service_requests sr   ON sr.id = b.request_id
  LEFT JOIN public.request_contact_info ci ON ci.request_id = b.request_id
  WHERE b.payout_status = 'released'
    AND b.released_at IS NOT NULL
  ORDER BY b.released_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_released_bookings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_released_bookings() TO service_role;
