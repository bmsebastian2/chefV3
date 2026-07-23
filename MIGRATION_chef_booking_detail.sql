-- ============================================================================
-- MIGRACIÓN · Detalle de reserva bajo demanda (popup "Ver detalle" del chef)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema: get_chef_bookings() (MIGRATION_chef_booking_visibility.sql) ya
-- traía en cada carga de la lista —incluido el polling de 30s del dashboard—
-- los campos pesados de la propuesta (mensaje, menú, precios), el payout y la
-- dirección completa, aunque la UI no los pintaba. Esta migración:
--   1) Recorta get_chef_bookings() a lo que la lista realmente renderiza.
--   2) Agrega get_chef_booking_detail(booking_id) — RPC de lectura puntual,
--      mismo patrón SECURITY DEFINER, que el chef solo puede pedir para sus
--      propias reservas (valida chef_id = auth.uid() por dentro).
-- ============================================================================

-- ── 1. get_chef_bookings() recortada ────────────────────────────────────────
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
      'completed_at',       b.completed_at,
      'request_id',         sr.id,
      'service_type',       sr.service_type,
      'event_date_start',   sr.event_date_start,
      'event_date_end',     sr.event_date_end,
      'event_time',         sr.event_time,
      'occasion',           sr.occasion,
      'city',                sr.city,
      'client_name',        COALESCE(
        NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.first_surname,'')), ''),
        rci.full_name,
        'Cliente'
      ),
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

-- ── 2. get_chef_booking_detail(booking_id) — bajo demanda ───────────────────
-- Solo lo que la lista NO trae: la gestión (propuesta), la línea de tiempo,
-- el payout y el contacto/dirección completa. El resto (cliente, ciudad,
-- fechas, monto total) ya viajó con get_chef_bookings().
CREATE OR REPLACE FUNCTION public.get_chef_booking_detail(
  p_booking_id uuid
)
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
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'confirmed_at',         b.confirmed_at,
    'completed_at',         b.completed_at,
    'chef_payout_amount',   b.chef_payout_amount,
    'payout_status',        b.payout_status,
    'released_at',          b.released_at,
    'location',             sr.location,
    'client_phone',         rci.phone,
    'proposal_message',     p.message,
    'proposal_menu',        p.menu_description,
    'proposal_price_total', p.price_total,
    'proposal_price_person',p.price_per_person,
    'proposal_sent_at',     p.created_at
  )
  INTO v_result
  FROM bookings b
  JOIN service_requests sr ON sr.id = b.request_id
  LEFT JOIN proposals p    ON p.id  = b.proposal_id
  LEFT JOIN request_contact_info rci ON rci.request_id = sr.id
  WHERE b.id = p_booking_id
    AND b.chef_id = v_chef_id;

  RETURN v_result;
END;
$$;

REVOKE ALL   ON FUNCTION public.get_chef_booking_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chef_booking_detail(uuid) TO authenticated;
