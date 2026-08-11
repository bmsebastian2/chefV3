-- ============================================================================
-- MIGRACIÓN · Vitrina pública: solo chefs "calificados"
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Hoy la vitrina pública (home, mapa, asistente) solo exige is_active=true +
-- admin_blocked=false. Eso no alcanza: is_active nace en true al registrarse
-- y solo lo apaga el propio chef a mano — nunca se pone en false solo porque
-- el perfil está incompleto. Resultado: chefs sin foto, sin email confirmado
-- o recién registrados aparecen en la vitrina.
--
-- Un chef "calificado" para la vitrina pública exige TODO esto:
--   1. is_active = true            (el chef no se auto-ocultó)
--   2. admin_blocked = false       (regla ya existente)
--   3. email confirmado            (auth.users.email_confirmed_at IS NOT NULL —
--                                    señal real: "Confirm email" está activo y
--                                    registerChef exige confirmación por Resend,
--                                    ver commit 361e362)
--   4. foto de perfil               (chef_photos type='profile', al menos 1 fila)
--
-- (Se probó además exigir el umbral "meetsRequirements" del dashboard —
-- galería≥12, menús≥3, platos≥6 — pero dejaba afuera chefs con perfil válido
-- y solo menús/platos sin cargar todavía [caso Horacio Bollo, 2026-08-11].
-- Se retiró: no se aplica en ningún lado a nivel de datos hoy, solo
-- deshabilita el switch de "Perfil activo" en la UI del dashboard.)
--
-- El dashboard del propio chef (src/app/dashboard/**) sigue leyendo
-- chef_profiles directo, sin pasar por esta vista — el chef se ve a sí mismo
-- incompleto para poder completarse. Esta migración no lo toca.
--
-- Puntos que pasan a usar el criterio de calificación:
--   1) qualified_chef_profiles        — vista base, uso interno (nueva)
--   2) get_public_chef_cards          — home (#chefs) + directorio /chefs (nueva)
--   3) get_active_chefs_for_map       — mapa público de la home
--   4) get_assistant_cuisines         — chips de cocina del asistente
--   5) match_chefs                    — resultados del asistente de búsqueda
-- ============================================================================


-- ── 1) Vista base: chefs que califican para la vitrina pública ──────────────
-- Solo la consumen funciones SECURITY DEFINER de más abajo (corren con el
-- privilegio del dueño de la función, igual que ya pasa hoy leyendo
-- chef_profiles/chef_photos pese a RLS). No se expone directo a anon/authenticated.
CREATE OR REPLACE VIEW public.qualified_chef_profiles AS
SELECT
  cp.id,
  cp.user_id,
  cp.tagline,
  cp.city,
  cp.country,
  cp.experience_years,
  cp.rating_avg,
  cp.rating_count,
  cp.total_services,
  cp.is_pro,
  u.first_name,
  u.first_surname,
  u.second_surname,
  u.avatar_url,
  (
    SELECT ph.url
    FROM chef_photos ph
    WHERE ph.chef_id = cp.id
      AND ph.type = 'profile'
    ORDER BY ph.sort_order, ph.created_at
    LIMIT 1
  ) AS profile_photo_url
FROM chef_profiles cp
JOIN users u ON u.id = cp.user_id
JOIN auth.users au ON au.id = cp.user_id
WHERE cp.is_active = true
  AND cp.admin_blocked = false
  AND au.email_confirmed_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM chef_photos ph
    WHERE ph.chef_id = cp.id AND ph.type = 'profile'
  );

REVOKE ALL ON public.qualified_chef_profiles FROM PUBLIC, anon, authenticated;


-- ── 2) Home (#chefs) + directorio /chefs ─────────────────────────────────────
-- Reemplaza las lecturas directas de chef_profiles en src/lib/chefs.ts
-- (getFeaturedChefs / getChefsPage). p_limit=NULL trae todas las filas.
CREATE OR REPLACE FUNCTION public.get_public_chef_cards(
  p_limit  integer DEFAULT NULL,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  name              text,
  tagline           text,
  city              text,
  country           text,
  experience_years  integer,
  is_pro            boolean,
  image_url         text,
  rating_avg        numeric,
  rating_count      integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id,
    NULLIF(TRIM(CONCAT_WS(' ', q.first_name, q.first_surname, q.second_surname)), '') AS name,
    q.tagline,
    q.city,
    q.country,
    q.experience_years,
    q.is_pro,
    COALESCE(q.profile_photo_url, q.avatar_url) AS image_url,
    q.rating_avg,
    q.rating_count
  FROM public.qualified_chef_profiles q
  ORDER BY q.is_pro DESC, q.rating_avg DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

REVOKE ALL    ON FUNCTION public.get_public_chef_cards(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_chef_cards(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_chef_cards(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_chef_cards(integer, integer) TO service_role;


-- ── 3) Mapa público ───────────────────────────────────────────────────────────
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
        'id',            q.id,
        'first_name',    q.first_name,
        'first_surname', q.first_surname,
        'photo_url',     COALESCE(q.profile_photo_url, q.avatar_url),
        'city',          q.city,
        'rating_avg',    q.rating_avg,
        'tagline',       q.tagline
      )
    ),
    '[]'::JSONB
  )
  INTO result
  FROM public.qualified_chef_profiles q
  WHERE q.city IS NOT NULL
    -- Solo Nicaragua: evita falsos positivos (León/Granada también existen en España).
    AND lower(q.country) = 'nicaragua';

  RETURN result;
END;
$function$;
-- CREATE OR REPLACE preserva los GRANT existentes (anon/authenticated/service_role).


-- ── 4) Chips de cocina del asistente ──────────────────────────────────────────
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
  join public.qualified_chef_profiles q
    on q.id = m.chef_id
  cross join lateral unnest(
    array_remove(array_append(m.cuisine_types, m.cuisine_type), null)
  ) as c
  where m.is_active = true
  group by c
  order by chef_count desc, c;
$function$;


-- ── 5) Resultados del asistente de búsqueda ──────────────────────────────────
-- La definición vigente en prod devuelve rating_count (assistant_match_chefs.sql
-- original) — src/components/assistant/actions.ts lo espera (MatchChefsRow.rating_count).
-- CREATE OR REPLACE no alcanza para cambiar el RETURNS TABLE: hay que dropearla primero.
DROP FUNCTION IF EXISTS public.match_chefs(text, text, integer);

CREATE FUNCTION public.match_chefs(p_service_type text DEFAULT NULL::text, p_cuisine text DEFAULT NULL::text, p_guests integer DEFAULT NULL::integer)
 RETURNS TABLE(chef_id uuid, full_name text, tagline text, city text, rating_avg numeric, rating_count integer, total_services integer, photo_url text, cuisines text[], match_level integer)
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
        q.id                                                  as chef_id,
        nullif(trim(concat_ws(' ', q.first_name, q.first_surname)), '') as full_name,
        q.tagline,
        q.city,
        q.rating_avg,
        q.rating_count,
        q.total_services,
        q.profile_photo_url,
        q.avatar_url,
        rs.accepts_single,
        rs.accepts_multiple,
        rs.accepts_weekly,
        rs.min_guests,
        rs.max_guests
      from public.qualified_chef_profiles q
      left join request_settings rs
        on rs.chef_id = q.id
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
      f.rating_count,
      f.total_services,
      coalesce(f.profile_photo_url, f.avatar_url) as photo_url,
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

-- DROP FUNCTION se llevó puestos los GRANT anteriores: hay que re-otorgarlos.
GRANT EXECUTE ON FUNCTION public.match_chefs(text, text, integer) TO anon, authenticated, service_role;
