-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: get_cancelled_applied_requests()
-- Retorna las solicitudes canceladas donde el chef autenticado tiene propuesta.
-- Sólo el chef que se postuló puede ver estas solicitudes canceladas.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_cancelled_applied_requests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_chef_id UUID;
  result    JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN '[]'::JSONB; END IF;

  SELECT id INTO v_chef_id FROM chef_profiles WHERE user_id = v_user_id;
  IF v_chef_id IS NULL THEN RETURN '[]'::JSONB; END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',               sr.id,
        'status',           sr.status,
        'service_type',     sr.service_type,
        'event_date_start', sr.event_date_start,
        'event_date_end',   sr.event_date_end,
        'event_time',       sr.event_time,
        'budget_min',       sr.budget_min,
        'budget_max',       sr.budget_max,
        'cuantas_personas', sr.cuantas_personas,
        'guests_adults',    sr.guests_adults,
        'guests_teens',     sr.guests_teens,
        'guests_kids',      sr.guests_kids,
        'occasion',         sr.occasion,
        'location',         sr.location,
        'city',             sr.city,
        'cuisine_type',     sr.cuisine_type,
        'client_name',      COALESCE(rci.full_name, 'Cliente')
      )
    ),
    '[]'::JSONB
  )
  INTO result
  FROM service_requests sr
  JOIN proposals p
    ON p.request_id = sr.id
   AND p.chef_id    = v_chef_id
  LEFT JOIN request_contact_info rci
    ON rci.request_id = sr.id
  WHERE sr.status = 'cancelled';

  RETURN result;
END;
$$;

REVOKE ALL   ON FUNCTION get_cancelled_applied_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cancelled_applied_requests() TO authenticated;
