-- ============================================================================
-- MIGRACIÓN · Visibilidad de reservas pagadas en el dashboard del chef
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema: al pagar el cliente, create_booking_for_payment() pasa
-- service_requests.status a 'booked' (y luego complete_booking() a 'completed').
-- get_chef_requests_state() solo trae status = 'new', así que la solicitud
-- desaparece del dashboard del chef justo cuando gana el trabajo — sin dejar
-- rastro de la fecha, el cliente o el monto.
--
-- Esta migración agrega:
--   1) bookings.chef_notified_at — claim atómico para el email de "reserva
--      confirmada" (evita duplicados si el webhook de pago reintenta).
--   2) get_chef_bookings() — RPC de lectura, mismo patrón que
--      get_chef_requests_state(): trae bookings 'confirmed'/'completed' del
--      chef autenticado con los datos de la solicitud, la propuesta ganadora
--      y la reseña (si el cliente ya la dejó).
-- ============================================================================

-- ── 1. Columna de idempotencia del email de reserva confirmada ─────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS chef_notified_at timestamptz;

-- ── 2. Bookings del chef, con detalle de solicitud + propuesta + reseña ─────
CREATE OR REPLACE FUNCTION public.get_chef_bookings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id uuid;
  v_result  jsonb;
BEGIN
  SELECT id INTO v_chef_id
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                 b.id,
      'booking_status',     b.booking_status,
      'total_amount',       b.total_amount,
      'currency',           b.currency,
      'chef_payout_amount', b.chef_payout_amount,
      'payout_status',      b.payout_status,
      'confirmed_at',       b.confirmed_at,
      'completed_at',       b.completed_at,
      'request_id',         sr.id,
      'service_type',       sr.service_type,
      'event_date_start',   sr.event_date_start,
      'event_date_end',     sr.event_date_end,
      'event_time',         sr.event_time,
      'occasion',           sr.occasion,
      'location',           sr.location,
      'city',               sr.city,
      'client_name',        COALESCE(
        NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.first_surname,'')), ''),
        rci.full_name,
        'Cliente'
      ),
      'proposal_message',        p.message,
      'proposal_menu',           p.menu_description,
      'proposal_price_total',    p.price_total,
      'proposal_price_person',   p.price_per_person,
      'review', CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object(
        'rating_chef',         r.rating_chef,
        'rating_food',         r.rating_food,
        'rating_presentation', r.rating_presentation,
        'rating_cleanliness',  r.rating_cleanliness,
        'comment',             r.comment
      ) END
    )
    ORDER BY COALESCE(b.completed_at, b.confirmed_at) DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM bookings b
  JOIN service_requests sr ON sr.id = b.request_id
  LEFT JOIN proposals p    ON p.id  = b.proposal_id
  LEFT JOIN users u        ON u.id  = sr.user_id
  LEFT JOIN request_contact_info rci ON rci.request_id = sr.id
  LEFT JOIN reviews r      ON r.booking_id = b.id
  WHERE b.chef_id = v_chef_id
    AND b.booking_status IN ('confirmed', 'completed');

  RETURN v_result;
END;
$$;

REVOKE ALL   ON FUNCTION public.get_chef_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chef_bookings() TO authenticated;
