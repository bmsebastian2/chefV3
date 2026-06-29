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
--   4) get_matching_chefs_for_request  — [ELIMINADA] código muerto, ver abajo
--   5) get_chef_requests_state         — [MOVIDA] ver MIGRATION_matching_dashboard.sql
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


-- ── 4) [ELIMINADA] get_matching_chefs_for_request ───────────────────────────
-- Esta función se borró (ver MIGRATION_drop_matching_chefs_function.sql): era
-- código muerto — ningún código de la app la llamaba (notify-chefs.ts filtra en
-- JS). NO la recrees acá. El bloqueo admin para el email de notificación se hace
-- en notify-chefs.ts (chef_profiles.is_active) + el guard de submit_proposal.


-- ── 5) [MOVIDA] get_chef_requests_state ──────────────────────────────────────
-- La definición canónica vive ahora en MIGRATION_matching_dashboard.sql, que
-- incluye TANTO el guard admin_blocked (devuelve { blocked: true }) COMO el
-- matching geográfico (país + ciudad ∈ cobertura). Se quitó la copia de acá
-- para no mantener dos versiones divergentes: una sola fuente de verdad.


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
