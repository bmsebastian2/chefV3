-- ============================================================================
-- MIGRACIÓN · Aplicar el bloqueo admin en TODOS los puntos donde opera un chef
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: MIGRATION_admin_block_chef.sql ya aplicada (columna admin_blocked).
--
-- Regla en todos lados: el chef solo aparece/recibe/opera si
--   is_active = true  AND  admin_blocked = false
--
-- Son CREATE OR REPLACE de las definiciones REALES (verificadas contra la DB),
-- con el único cambio de sumar la condición admin_blocked. CREATE OR REPLACE
-- preserva los GRANT existentes, así que no hace falta re-otorgarlos.
--
-- Puntos cubiertos:
--   1) get_active_chefs_for_map        — mapa público de la home
--   2) get_assistant_cuisines          — chips de cocina del asistente
--   3) match_chefs                     — resultados del asistente de búsqueda
--   4) get_matching_chefs_for_request  — emails a chefs de nuevas solicitudes
--   5) get_chef_requests_state         — feed de solicitudes del chef (+ flag blocked)
--   6) submit_proposal                 — envío de propuestas (guard)
-- ============================================================================


-- ── 1) Mapa público ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_active_chefs_for_map()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',            cp.id,
        'first_name',    u.first_name,
        'first_surname', u.first_surname,
        'photo_url',     COALESCE(
                           (SELECT ph.url
                              FROM chef_photos ph
                             WHERE ph.chef_id = cp.id
                               AND ph.type = 'profile'
                             ORDER BY ph.created_at DESC
                             LIMIT 1),
                           u.avatar_url
                         ),
        'city',          cp.city,
        'rating_avg',    cp.rating_avg,
        'tagline',       cp.tagline
      )
    ),
    '[]'::JSONB
  )
  INTO result
  FROM chef_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE cp.is_active = TRUE
    AND cp.admin_blocked = FALSE          -- ← bloqueo admin
    AND cp.city IS NOT NULL
    AND lower(cp.country) = 'nicaragua';

  RETURN result;
END;
$function$;


-- ── 2) Chips de cocina del asistente ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_assistant_cuisines()
 RETURNS TABLE(cuisine text, chef_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c                                as cuisine,
    count(distinct m.chef_id)::int   as chef_count
  from chef_menus m
  join chef_profiles cp
    on cp.id = m.chef_id
   and cp.is_active = true
   and cp.admin_blocked = false          -- ← bloqueo admin
  cross join lateral unnest(
    array_remove(array_append(m.cuisine_types, m.cuisine_type), null)
  ) as c
  where m.is_active = true
  group by c
  order by chef_count desc, c;
$function$;


-- ── 3) Resultados del asistente de búsqueda ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_chefs(p_service_type text DEFAULT NULL::text, p_cuisine text DEFAULT NULL::text, p_guests integer DEFAULT NULL::integer)
 RETURNS TABLE(chef_id uuid, full_name text, tagline text, city text, rating_avg numeric, total_services integer, photo_url text, cuisines text[], match_level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_level int;
  v_count int;
begin
  for v_level in 0..3 loop
    return query
    with base as (
      select
        cp.id                                                  as chef_id,
        nullif(trim(concat_ws(' ', u.first_name, u.first_surname)), '') as full_name,
        cp.tagline,
        cp.city,
        cp.rating_avg,
        cp.total_services,
        rs.accepts_single,
        rs.accepts_multiple,
        rs.accepts_weekly,
        rs.min_guests,
        rs.max_guests
      from chef_profiles cp
      join users u
        on u.id = cp.user_id
      left join request_settings rs
        on rs.chef_id = cp.id
      where cp.is_active = true
        and cp.admin_blocked = false      -- ← bloqueo admin
    ),
    filtered as (
      select b.*
      from base b
      where
        (
          v_level >= 3
          or p_service_type is null
          or (p_service_type = 'single'   and coalesce(b.accepts_single,   false))
          or (p_service_type = 'multiple' and coalesce(b.accepts_multiple, false))
          or (p_service_type = 'weekly'   and coalesce(b.accepts_weekly,   false))
        )
        and (
          v_level >= 2
          or p_guests is null
          or (
            coalesce(b.min_guests, 1)    <= p_guests
            and coalesce(b.max_guests, 9999) >= p_guests
          )
        )
        and (
          v_level >= 1
          or p_cuisine is null
          or exists (
            select 1
            from chef_menus m
            where m.chef_id = b.chef_id
              and m.is_active = true
              and (m.cuisine_type = p_cuisine or p_cuisine = any(m.cuisine_types))
          )
        )
    )
    select
      f.chef_id,
      f.full_name,
      f.tagline,
      f.city,
      f.rating_avg,
      f.total_services,
      (
        select ph.url
        from chef_photos ph
        where ph.chef_id = f.chef_id
          and ph.type = 'profile'
        order by ph.sort_order, ph.created_at
        limit 1
      ) as photo_url,
      (
        select array_agg(distinct c)
        from chef_menus m
        cross join lateral unnest(
          array_remove(array_append(m.cuisine_types, m.cuisine_type), null)
        ) as c
        where m.chef_id = f.chef_id
          and m.is_active = true
      ) as cuisines,
      v_level as match_level
    from filtered f
    order by f.rating_avg desc nulls last, f.total_services desc nulls last;

    get diagnostics v_count = row_count;
    if v_count > 0 then
      return;
    end if;
  end loop;
end;
$function$;


-- ── 4) Emails a chefs de nuevas solicitudes ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_matching_chefs_for_request(p_request_id uuid)
 RETURNS TABLE(email text, first_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    cp.is_active = true
    AND cp.admin_blocked = false          -- ← bloqueo admin

    AND (
      cp.city IS NULL
      OR lower(trim(cp.city)) = lower(trim(v_city))
    )

    AND (
      (v_service_type = 'single'   AND rs.accepts_single   = true) OR
      (v_service_type = 'multiple' AND rs.accepts_multiple = true) OR
      (v_service_type = 'weekly'   AND rs.accepts_weekly   = true)
    )

    AND (
      v_guests_adults IS NULL OR (
        v_guests_adults >= COALESCE(rs.min_guests, 1) AND
        v_guests_adults <= COALESCE(rs.max_guests, 9999)
      )
    )

    AND (
      rs.min_budget IS NULL OR
      v_budget_max  IS NULL OR
      v_budget_max >= rs.min_budget
    )

    AND (
      COALESCE(rs.advance_days, 0) = 0 OR
      v_date_start IS NULL OR
      v_date_start >= (current_date + COALESCE(rs.advance_days, 0))
    );
END;
$function$;


-- ── 5) Feed de solicitudes del chef (+ flag blocked para el banner) ──────────
CREATE OR REPLACE FUNCTION public.get_chef_requests_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_chef_id        uuid;
  v_blocked        boolean;
  v_profile_photos bigint;
  v_gallery_photos bigint;
  v_menus          bigint;
  v_dishes         bigint;
  v_missing        jsonb := '[]'::jsonb;
  v_settings       record;
  v_min_date       date;
  v_requests       jsonb;
BEGIN
  -- Resolver chef desde sesión (+ estado de bloqueo)
  SELECT id, admin_blocked INTO v_chef_id, v_blocked
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
$function$;


-- ── 6) Envío de propuestas (guard de bloqueo) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_proposal(p_request_id uuid, p_message text DEFAULT NULL::text, p_menu_description text DEFAULT NULL::text, p_price_total numeric DEFAULT NULL::numeric, p_price_per_person numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chef_id     uuid;
  v_blocked     boolean;
  v_proposal_id uuid;
begin
  select id, admin_blocked into v_chef_id, v_blocked
  from chef_profiles
  where user_id = auth.uid();

  if v_chef_id is null then
    raise exception 'Chef profile not found';
  end if;

  if v_blocked then
    raise exception 'chef_blocked';
  end if;

  insert into proposals (request_id, chef_id, message, menu_description, price_total, price_per_person)
  values (p_request_id, v_chef_id, p_message, p_menu_description, p_price_total, p_price_per_person)
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$function$;
