-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: get_matching_chefs_for_request(p_request_id uuid)
-- Retorna los chefs activos cuyas preferencias coinciden con la solicitud.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_matching_chefs_for_request(p_request_id uuid)
RETURNS TABLE(email text, first_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_type     text;
  v_city             text;
  v_date_start       date;
  v_guests_adults    integer;
  v_budget_max       numeric;
BEGIN
  SELECT
    sr.service_type,
    sr.city,
    sr.event_date_start,
    sr.guests_adults,
    sr.budget_max
  INTO
    v_service_type,
    v_city,
    v_date_start,
    v_guests_adults,
    v_budget_max
  FROM service_requests sr
  WHERE sr.id = p_request_id;

  RETURN QUERY
  SELECT
    u.email::text,
    u.first_name::text
  FROM chef_profiles cp
  JOIN public.users u  ON u.id  = cp.user_id
  JOIN request_settings rs ON rs.chef_id = cp.id
  WHERE
    -- Chef must be active
    cp.is_active = true

    -- City must match (case-insensitive), or chef has no city set
    AND (
      cp.city IS NULL
      OR lower(trim(cp.city)) = lower(trim(v_city))
    )

    -- Chef accepts this service type
    AND (
      (v_service_type = 'single'   AND rs.accepts_single   = true) OR
      (v_service_type = 'multiple' AND rs.accepts_multiple = true) OR
      (v_service_type = 'weekly'   AND rs.accepts_weekly   = true)
    )

    -- Guest count within chef's range (null guest count always passes)
    AND (
      v_guests_adults IS NULL OR (
        v_guests_adults >= COALESCE(rs.min_guests, 1) AND
        v_guests_adults <= COALESCE(rs.max_guests, 9999)
      )
    )

    -- Budget at or above chef's minimum (null budget always passes)
    AND (
      rs.min_budget IS NULL OR
      v_budget_max  IS NULL OR
      v_budget_max >= rs.min_budget
    )

    -- Event date respects advance_days requirement
    AND (
      COALESCE(rs.advance_days, 0) = 0 OR
      v_date_start IS NULL OR
      v_date_start >= (current_date + COALESCE(rs.advance_days, 0))
    );
END;
$$;

REVOKE ALL ON FUNCTION get_matching_chefs_for_request(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_matching_chefs_for_request(uuid) TO authenticated, anon, service_role;
