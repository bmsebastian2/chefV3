-- ============================================================================
-- MIGRACIÓN · Badge de solicitudes nuevas sin ver (dashboard del chef)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Contexto: la card "Tu primer pedido está por llegar" en /dashboard es
-- estática y el nav "Solicitudes" no indica si hay algo nuevo. Se agrega un
-- timestamp de última visita por chef (request_settings.last_viewed_at) y dos
-- funciones SECURITY DEFINER:
--   - get_chef_requests_badge(): count liviano de solicitudes 'new' que
--     matchean al chef (mismo gate + WHERE que get_chef_requests_state, ver
--     MIGRATION_fix_requests_gate_thresholds.sql) creadas después de
--     last_viewed_at. Se llama en cada carga del dashboard/layout — no trae
--     las solicitudes completas, solo el número.
--   - mark_chef_requests_viewed(): pisa last_viewed_at = now(). Se llama al
--     entrar a /dashboard/requests.
--
-- DEFAULT now() en el ALTER TABLE: para que chefs ya existentes con
-- solicitudes pendientes de larga data no vean de golpe un badge inflado con
-- todo lo histórico — el corte arranca desde que se corre esta migración.
--
-- Duplicación conocida: el WHERE de matching (geografía + preferencias +
-- advance_days) vive acá Y en get_chef_requests_state(). SQL no puede
-- importar de un solo lugar (mismo problema ya anotado en
-- MIGRATION_fix_requests_gate_thresholds.sql) — si el matching cambia, hay
-- que actualizar las dos funciones a mano.
-- ============================================================================

ALTER TABLE public.request_settings
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────────────
-- get_chef_requests_badge() — count liviano de solicitudes nuevas sin ver
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_chef_requests_badge()
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
  v_covered          text[];
  v_profile_photos   bigint;
  v_gallery_photos   bigint;
  v_menus            bigint;
  v_dishes           bigint;
  v_settings         record;
  v_min_date         date;
  v_count            integer;
BEGIN
  SELECT id, admin_blocked, city, country, COALESCE(additional_cities, '{}')
  INTO   v_chef_id, v_blocked, v_city, v_country, v_additional
  FROM chef_profiles
  WHERE user_id = auth.uid();

  -- Sin perfil de chef, o bloqueado por admin: no ve nada, igual que
  -- get_chef_requests_state.
  IF v_chef_id IS NULL OR v_blocked THEN
    RETURN jsonb_build_object('count', 0, 'last_viewed_at', NULL);
  END IF;

  SELECT
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = v_chef_id AND type = 'profile'),
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = v_chef_id AND type = 'gallery'),
    (SELECT COUNT(*) FROM chef_menus  WHERE chef_id = v_chef_id AND is_active = true),
    (SELECT COUNT(*) FROM dishes       WHERE chef_id = v_chef_id AND is_active = true)
  INTO v_profile_photos, v_gallery_photos, v_menus, v_dishes;

  -- Mismos mínimos que get_chef_requests_state (MIN_PROFILE_PHOTOS=1,
  -- MIN_GALLERY_PHOTOS=7, MIN_MENUS=3, MIN_DISHES=4): si el chef no los
  -- cumple, no puede recibir solicitudes y el badge debe ser 0.
  IF v_profile_photos < 1 OR v_gallery_photos < 7 OR v_menus < 3 OR v_dishes < 4 THEN
    RETURN jsonb_build_object('count', 0, 'last_viewed_at', NULL);
  END IF;

  SELECT * INTO v_settings FROM request_settings WHERE chef_id = v_chef_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('count', 0, 'last_viewed_at', NULL);
  END IF;

  v_min_date := CURRENT_DATE + COALESCE(v_settings.advance_days, 0);
  v_covered := array_remove(
    array_prepend(normalize_city(v_city), v_additional),
    NULL
  );

  SELECT COUNT(*) INTO v_count
  FROM service_requests sr
  WHERE sr.status = 'new'
    AND sr.created_at > v_settings.last_viewed_at
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

  RETURN jsonb_build_object('count', v_count, 'last_viewed_at', v_settings.last_viewed_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chef_requests_badge() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- mark_chef_requests_viewed() — marca "visto" al entrar a /dashboard/requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_chef_requests_viewed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE request_settings
  SET last_viewed_at = now()
  WHERE chef_id = (SELECT id FROM chef_profiles WHERE user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_chef_requests_viewed() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- Debe existir la columna:
--   SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'request_settings'
--     AND column_name = 'last_viewed_at';
--
-- Debe existir el GRANT a authenticated en ambas funciones:
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('get_chef_requests_badge', 'mark_chef_requests_viewed');
