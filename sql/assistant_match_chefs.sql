-- ============================================================================
--  Asistente de búsqueda de chefs (home) — funciones de soporte
--  Correr en: Supabase → SQL Editor.
--  Ambas son SECURITY DEFINER porque el visitante es anónimo y RLS
--  bloquea la lectura directa de chef_profiles / chef_menus.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) get_assistant_cuisines()
--    Devuelve las cocinas que REALMENTE existen en menús activos de chefs
--    activos, con cuántos chefs ofrecen cada una. Se usa para generar los
--    chips de la pregunta "¿Qué tipo de cocina?" desde datos reales.
-- ----------------------------------------------------------------------------
create or replace function public.get_assistant_cuisines()
returns table (
  cuisine     text,
  chef_count  int
)
language sql
security definer
set search_path = public
as $$
  select
    c                                as cuisine,
    count(distinct m.chef_id)::int   as chef_count
  from chef_menus m
  join chef_profiles cp
    on cp.id = m.chef_id
   and cp.is_active = true
  cross join lateral unnest(
    -- une el enum único (cuisine_type) con el array (cuisine_types) y limpia nulls
    array_remove(array_append(m.cuisine_types, m.cuisine_type), null)
  ) as c
  where m.is_active = true
  group by c
  order by chef_count desc, c;
$$;


-- ----------------------------------------------------------------------------
-- 2) match_chefs(p_service_type, p_cuisine, p_guests)
--    Devuelve chefs que matchean, con RELAJACIÓN AUTOMÁTICA de filtros.
--
--    Niveles (match_level en el resultado):
--      0 = match exacto       → servicio + cocina + personas
--      1 = se soltó cocina    → servicio + personas
--      2 = se soltó personas  → solo servicio
--      3 = se soltó servicio  → todos los chefs activos (último recurso)
--
--    Devuelve el PRIMER nivel que produzca al menos un chef. El frontend usa
--    match_level para mostrar "match exacto" vs "los más cercanos a lo que
--    buscabas".
--
--    Parámetros (todos opcionales / nullables):
--      p_service_type : 'single' | 'multiple' | 'weekly' | null
--      p_cuisine      : enum de cocina (p.ej. 'italian') | null
--      p_guests       : nº representativo de comensales (2,6,12,13...) | null
-- ----------------------------------------------------------------------------
-- Cambia el tipo de retorno (agrega rating_count) → CREATE OR REPLACE no basta,
-- hay que dropear la función previa primero (firma por argumentos, no por retorno).
drop function if exists public.match_chefs(text, text, int);

create or replace function public.match_chefs(
  p_service_type text default null,
  p_cuisine      text default null,
  p_guests       int  default null
)
returns table (
  chef_id        uuid,
  full_name      text,
  tagline        text,
  city           text,
  rating_avg     numeric,
  rating_count   int,
  total_services int,
  photo_url      text,
  cuisines       text[],
  match_level    int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int;
  v_count int;
begin
  -- Itera de lo más estricto (0) a lo más flexible (3); corta en el primero con filas.
  for v_level in 0..3 loop
    return query
    with base as (
      select
        cp.id                                                  as chef_id,
        nullif(trim(concat_ws(' ', u.first_name, u.first_surname)), '') as full_name,
        cp.tagline,
        cp.city,
        cp.rating_avg,
        cp.rating_count,
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
    ),
    filtered as (
      select b.*
      from base b
      where
        -- Filtro de servicio: activo en niveles 0-2, se suelta en nivel 3
        (
          v_level >= 3
          or p_service_type is null
          or (p_service_type = 'single'   and coalesce(b.accepts_single,   false))
          or (p_service_type = 'multiple' and coalesce(b.accepts_multiple, false))
          or (p_service_type = 'weekly'   and coalesce(b.accepts_weekly,   false))
        )
        -- Filtro de comensales: activo en niveles 0-1, se suelta en nivel >= 2
        and (
          v_level >= 2
          or p_guests is null
          or (
            coalesce(b.min_guests, 1)    <= p_guests
            and coalesce(b.max_guests, 9999) >= p_guests
          )
        )
        -- Filtro de cocina: activo SOLO en nivel 0
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
      return;  -- ya tenemos resultados en este nivel, no relajar más
    end if;
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- Permisos de ejecución. Las llamamos vía service-role desde el server action,
-- pero concedemos a anon/authenticated por si se invocan desde el cliente.
-- ----------------------------------------------------------------------------
grant execute on function public.get_assistant_cuisines()            to anon, authenticated, service_role;
grant execute on function public.match_chefs(text, text, int)        to anon, authenticated, service_role;
