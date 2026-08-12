-- ============================================================================
-- FIX · get_chef_requests_state() tenía umbrales desactualizados
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- El commit "Reducir requisitos" (1ba4c56) actualizó los umbrales mínimos en
-- src/lib/chefRequirements.ts (MIN_GALLERY_PHOTOS 7, MIN_DISHES 4) pero nunca
-- tocó esta función SQL, que tiene sus propios números hardcodeados y quedó
-- desincronizada:
--   - galería:  exigía 12 fotos  → debe ser 7  (MIN_GALLERY_PHOTOS)
--   - platos:   exigía 6 platos  → debe ser 4  (MIN_DISHES)
--   - menús:    3                → ya estaba correcto (MIN_MENUS), sin cambios
--   - foto de perfil: 1          → ya estaba correcto (MIN_PROFILE_PHOTOS), sin cambios
--
-- Efecto del bug: un chef podía cumplir el mínimo real (7 galería / 4 platos,
-- reflejado en /dashboard y en la barra de "Fotos de trabajo") y ver su perfil
-- "activo", pero /dashboard/requests seguía bloqueándolo pidiendo 12 y 6 — dos
-- gates distintos con criterios distintos para lo mismo.
--
-- No hay forma de que SQL importe chefRequirements.ts: si ese archivo cambia
-- de nuevo, esta función hay que actualizarla a mano en un futuro fix.
--
-- Basado en la definición vigente (MIGRATION_request_facets_chef_cards.sql,
-- 2026-08-05 — la más reciente que redefine esta función completa). Solo
-- cambian los dos umbrales; el resto del cuerpo queda idéntico.
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
  IF v_gallery_photos < 7 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'gallery', 'label', 'Galería de platos',
      'current', v_gallery_photos, 'required', 7,
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
  IF v_dishes < 4 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object(
      'key', 'dishes', 'label', 'Platos',
      'current', v_dishes, 'required', 4,
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
      ),
      'restrictions', CASE WHEN rr.request_id IS NULL THEN NULL ELSE jsonb_build_object(
        'vegetariano',          rr.vegetariano,
        'vegano',                rr.vegano,
        'sin_gluten',            rr.sin_gluten,
        'sin_lactosa',           rr.sin_lactosa,
        'sin_mariscos',          rr.sin_mariscos,
        'sin_frutos_secos',      rr.sin_frutos_secos,
        'alergias_adicionales',  rr.alergias_adicionales,
        'notas_adicionales',     rr.notas_adicionales
      ) END,
      'meal_moments', (
        SELECT jsonb_build_object(
          'desayuno', bool_or(rd.desayuno),
          'almuerzo', bool_or(rd.almuerzo),
          'cena',     bool_or(rd.cena)
        )
        FROM request_dates rd
        WHERE rd.request_id = sr.id
      ),
      'weekly', CASE WHEN sr.service_type = 'weekly' AND wmd.request_id IS NOT NULL THEN jsonb_build_object(
        'comidas_por_semana',  wmd.comidas_por_semana,
        'raciones_por_comida', wmd.raciones_por_comida,
        'frecuencia_cocina',   wmd.frecuencia_cocina
      ) END
    )
    ORDER BY sr.created_at DESC
  )
  INTO v_requests
  FROM service_requests sr
  LEFT JOIN users u ON u.id = sr.user_id
  LEFT JOIN request_contact_info rci ON rci.request_id = sr.id
  LEFT JOIN request_restrictions rr ON rr.request_id = sr.id
  LEFT JOIN weekly_meal_details wmd ON wmd.request_id = sr.id
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

-- CREATE OR REPLACE preserva los GRANT existentes (authenticated); no hace
-- falta re-otorgarlos.
