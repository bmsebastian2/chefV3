-- ============================================================================
-- MIGRACIÓN · Matching geográfico en el listado del dashboard del chef
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere haber corrido antes: MIGRATION_chef_additional_cities.sql
--   (normalize_city, chef_profiles.additional_cities, service_requests.country)
--
-- Antes: get_chef_requests_state NO filtraba por geografía → el chef veía TODAS
-- las solicitudes 'new' del país (y técnicamente de cualquier país).
--
-- Ahora: una solicitud es visible solo si
--   normalize_city(sr.country) == normalize_city(chef.country)        ← país primero
--   AND normalize_city(sr.city) ∈ ( chef.city ∪ chef.additional_cities )
--
-- Las claves de additional_cities ya están normalizadas; la ciudad base y el
-- país/ciudad del request se normalizan al vuelo con normalize_city().
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chef_requests_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chef_id          uuid;
  v_blocked          boolean;
  v_city             text;
  v_country          text;
  v_additional       text[];
  v_covered          text[];   -- ciudad base + adicionales, todo normalizado
  v_profile_photos   bigint;
  v_gallery_photos   bigint;
  v_menus            bigint;
  v_dishes           bigint;
  v_missing          jsonb := '[]'::jsonb;
  v_settings         record;
  v_min_date         date;
  v_requests         jsonb;
BEGIN
  -- Resolver chef desde sesión (+ estado de bloqueo + ubicación)
  SELECT id, admin_blocked, city, country, COALESCE(additional_cities, '{}')
  INTO   v_chef_id, v_blocked, v_city, v_country, v_additional
  FROM chef_profiles
  WHERE user_id = auth.uid();

  IF v_chef_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Bloqueo admin: gana sobre todo. No ve requests, no puede recibir.
  IF v_blocked THEN
    RETURN jsonb_build_object(
      'can_receive', false,
      'blocked', true,
      'missing', '[]'::jsonb,
      'requests', '[]'::jsonb
    );
  END IF;

  -- Todos los conteos en un solo statement (sin round trips extra)
  SELECT
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = v_chef_id AND type = 'profile'),
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = v_chef_id AND type = 'gallery'),
    (SELECT COUNT(*) FROM chef_menus  WHERE chef_id = v_chef_id AND is_active = true),
    (SELECT COUNT(*) FROM dishes       WHERE chef_id = v_chef_id AND is_active = true)
  INTO v_profile_photos, v_gallery_photos, v_menus, v_dishes;

  IF v_profile_photos < 1 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'profile_picture', 'label', 'Foto de perfil',
      'current', v_profile_photos, 'required', 1,
      'href', '/dashboard/fotos'
    ));
  END IF;
  IF v_gallery_photos < 12 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'gallery', 'label', 'Galería de platos',
      'current', v_gallery_photos, 'required', 12,
      'href', '/dashboard/fotos'
    ));
  END IF;
  IF v_menus < 3 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'menus', 'label', 'Menús',
      'current', v_menus, 'required', 3,
      'href', '/dashboard/menus'
    ));
  END IF;
  IF v_dishes < 6 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'dishes', 'label', 'Platos',
      'current', v_dishes, 'required', 6,
      'href', '/dashboard/platos'
    ));
  END IF;

  IF jsonb_array_length(v_missing) > 0 THEN
    RETURN jsonb_build_object('can_receive', false, 'blocked', false, 'missing', v_missing, 'requests', '[]'::jsonb);
  END IF;

  SELECT * INTO v_settings FROM request_settings WHERE chef_id = v_chef_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_receive', false,
      'blocked', false,
      'missing', jsonb_build_array(jsonb_build_object(
        'key', 'request_prefs', 'label', 'Configuración de solicitudes',
        'current', 0, 'required', 1,
        'href', '/dashboard/request-settings'
      )),
      'requests', '[]'::jsonb
    );
  END IF;

  v_min_date := CURRENT_DATE + COALESCE(v_settings.advance_days, 0);

  -- Cobertura geográfica del chef: ciudad base (normalizada) + adicionales (ya
  -- normalizadas). Se quitan NULLs (chef sin ciudad base → solo adicionales).
  v_covered := array_remove(
    array_prepend(normalize_city(v_city), v_additional),
    NULL
  );

  SELECT jsonb_agg(
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
      'client_name',      COALESCE(
        NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.first_surname,'')), ''),
        rci.full_name,
        'Cliente'
      )
    )
    ORDER BY sr.created_at DESC
  )
  INTO v_requests
  FROM service_requests sr
  LEFT JOIN users u ON u.id = sr.user_id
  LEFT JOIN request_contact_info rci ON rci.request_id = sr.id
  WHERE sr.status = 'new'
    -- ── Geografía: país primero (innegociable), luego ciudad ∈ cobertura ──
    AND v_country IS NOT NULL
    AND normalize_city(sr.country) = normalize_city(v_country)
    AND normalize_city(sr.city) = ANY(v_covered)
    -- ── Preferencias de servicio del chef ──
    AND (
      (v_settings.accepts_single   AND sr.service_type = 'single')   OR
      (v_settings.accepts_multiple AND sr.service_type = 'multiple') OR
      (v_settings.accepts_weekly   AND sr.service_type = 'weekly')
    )
    AND (
      sr.cuantas_personas IS NULL OR (
        sr.cuantas_personas >= COALESCE(v_settings.min_guests, 1) AND
        sr.cuantas_personas <= COALESCE(v_settings.max_guests, 9999)
      )
    )
    AND (
      v_settings.min_budget IS NULL OR sr.budget_max IS NULL OR
      sr.budget_max >= v_settings.min_budget
    )
    AND (
      COALESCE(v_settings.advance_days, 0) = 0 OR
      sr.event_date_start IS NULL OR
      sr.event_date_start >= v_min_date
    );

  RETURN jsonb_build_object(
    'can_receive', true,
    'blocked', false,
    'missing', '[]'::jsonb,
    'requests', COALESCE(v_requests, '[]'::jsonb)
  );
END;
$$;

-- Mismos privilegios que la versión previa (CREATE OR REPLACE los conserva; se
-- re-aplican por las dudas si la función se recreó desde cero).
REVOKE ALL    ON FUNCTION public.get_chef_requests_state() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_chef_requests_state() TO authenticated;
