-- ============================================================================
-- MIGRACIÓN · Recordatorio por email a chefs con perfil incompleto
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema: un chef con perfil incompleto (sin foto, sin galería mínima, sin
-- menús/platos) no recibe solicitudes y hoy no tiene forma de enterarse por
-- qué. Se agrega un cron (Vercel Cron → API route, ver
-- src/app/api/cron/chef-completion-reminder/route.ts) que cada tantos días
-- le manda un recordatorio con el detalle exacto de qué le falta.
--
-- Reusa el gate real de recepción de solicitudes en vez de duplicarlo:
--   1) compute_chef_missing_requirements(chef_id) — función nueva, extraída
--      del bloque de conteo que antes vivía inline en get_chef_requests_state().
--      Misma lógica exacta, mismos umbrales (MIN_PROFILE_PHOTOS=1,
--      MIN_GALLERY_PHOTOS=7, MIN_MENUS=3, MIN_DISHES=4 — chefRequirements.ts).
--   2) get_chef_requests_state() — se redefine para LLAMAR a la función de
--      arriba en vez de repetir el cálculo. Comportamiento idéntico, el
--      shape del jsonb que devuelve no cambia.
--   3) get_chefs_for_completion_reminder() — función nueva para el barrido
--      masivo del cron: recorre chefs no bloqueados, con email confirmado,
--      llama a compute_chef_missing_requirements() por cada uno, y devuelve
--      solo los que tienen algo faltante Y están "en fecha" para recordatorio.
--
-- Nota (duplicación conocida, ya documentada en MIGRATION_chef_requests_badge.sql):
-- get_chef_requests_badge() sigue con su propio chequeo inline de los mismos
-- 4 umbrales — no se toca acá, fuera de alcance de este cambio. Si en algún
-- momento se vuelve a tocar chefRequirements.ts, quedan 2 lugares en SQL para
-- actualizar a mano (get_chef_requests_badge + compute_chef_missing_requirements),
-- uno menos que antes.
--
-- No-spam: profile_incomplete_reminder_count tope 3 (parámetro p_max_reminders),
-- profile_incomplete_reminder_last_sent_at con mínimo 5 días entre envíos
-- (parámetro p_min_days_since_last) — ambos con default pero ajustables desde
-- el caller sin tocar SQL de nuevo.
-- ============================================================================


-- ── 1) Columnas de tracking de recordatorios ─────────────────────────────────
ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS profile_incomplete_reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_incomplete_reminder_last_sent_at timestamptz;


-- ── 2) Helper extraído — mismo cálculo que antes vivía inline en
--       get_chef_requests_state(), ahora reusable desde cualquier función.
CREATE OR REPLACE FUNCTION public.compute_chef_missing_requirements(p_chef_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_photos bigint;
  v_gallery_photos bigint;
  v_menus          bigint;
  v_dishes         bigint;
  v_missing        jsonb := '[]'::jsonb;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = p_chef_id AND type = 'profile'),
    (SELECT COUNT(*) FROM chef_photos WHERE chef_id = p_chef_id AND type = 'gallery'),
    (SELECT COUNT(*) FROM chef_menus  WHERE chef_id = p_chef_id AND is_active = true),
    (SELECT COUNT(*) FROM dishes       WHERE chef_id = p_chef_id AND is_active = true)
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

  RETURN v_missing;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_chef_missing_requirements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_chef_missing_requirements(uuid) TO service_role;
-- get_chef_requests_state() corre SECURITY DEFINER y llama a esta función por
-- nombre calificado (public.compute_chef_missing_requirements) — no necesita
-- GRANT a authenticated para eso (mismo principio que cualquier función
-- SECURITY DEFINER llamando a otra function interna).


-- ── 3) get_chef_requests_state() — redefinición: mismo comportamiento exacto,
--       el bloque de conteo inline se reemplaza por una llamada al helper.
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

  v_missing := public.compute_chef_missing_requirements(v_chef_id);

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


-- ── 4) get_chefs_for_completion_reminder() — barrido masivo para el cron.
--       Solo service_role (el endpoint de Vercel Cron usa el admin client).
CREATE OR REPLACE FUNCTION public.get_chefs_for_completion_reminder(
  p_min_days_since_last integer DEFAULT 5,
  p_max_reminders integer DEFAULT 3
)
RETURNS TABLE (
  chef_id        uuid,
  user_id        uuid,
  email          text,
  first_name     text,
  missing        jsonb,
  reminder_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id,
    cp.user_id,
    u.email,
    u.first_name,
    x.missing,
    cp.profile_incomplete_reminder_count
  FROM chef_profiles cp
  JOIN public.users u ON u.id = cp.user_id
  JOIN auth.users au ON au.id = cp.user_id
  CROSS JOIN LATERAL (SELECT public.compute_chef_missing_requirements(cp.id)) AS x(missing)
  WHERE cp.admin_blocked = false
    AND au.email_confirmed_at IS NOT NULL
    AND cp.profile_incomplete_reminder_count < p_max_reminders
    AND (
      cp.profile_incomplete_reminder_last_sent_at IS NULL
      OR cp.profile_incomplete_reminder_last_sent_at < now() - (p_min_days_since_last || ' days')::interval
    )
    AND jsonb_array_length(x.missing) > 0;
$$;

REVOKE ALL ON FUNCTION public.get_chefs_for_completion_reminder(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chefs_for_completion_reminder(integer, integer) TO service_role;
-- Sin GRANT a anon/authenticated a propósito: expone email de otros chefs,
-- solo la llama el endpoint de cron con el admin client (service_role).


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — correr después de aplicar la migración.
-- ═══════════════════════════════════════════════════════════════════════════

-- 4a) Las columnas nuevas existen:
--   SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'chef_profiles'
--     AND column_name LIKE 'profile_incomplete_reminder%';

-- 4b) GRANT correcto en las 2 funciones nuevas (solo service_role, nada de
-- anon/authenticated):
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('compute_chef_missing_requirements', 'get_chefs_for_completion_reminder');

-- 4c) get_chef_requests_state() no se rompió — comparar el jsonb 'missing'
-- para un chef conocido contra lo que ya se veía en /dashboard/requests antes
-- de este cambio (mismo array, mismo orden, mismos labels/hrefs esperado):
--   SELECT compute_chef_missing_requirements(id) FROM chef_profiles WHERE user_id = '<uuid del chef de prueba>';

-- 4d) Preview de quiénes entrarían al recordatorio HOY (no envía nada, es
-- solo lectura — útil para validar el filtro antes de que el cron corra):
--   SELECT chef_id, email, first_name, missing, reminder_count
--   FROM get_chefs_for_completion_reminder();
