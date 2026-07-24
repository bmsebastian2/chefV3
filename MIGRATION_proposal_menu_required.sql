-- ============================================================================
-- MIGRACIÓN · Backstop de menú obligatorio en la propuesta
--
-- Contexto: toda propuesta debe describir un menú — es lo único que el cliente
-- evalúa junto al precio. La UI ya deshabilita el botón sin menú elegido y el
-- server action submitProposal() rechaza la descripción vacía, pero la RPC
-- acepta p_menu_description NULL (DEFAULT NULL en la firma): un chef autenticado
-- que llame submit_proposal() directo por PostgREST se saltea ambas capas e
-- inserta una propuesta sin menú. Este backstop cierra ese hueco EN la RPC,
-- simétrico al de precio ('proposal_price_out_of_range') que ya vive acá.
--
-- Regla: p_menu_description no puede ser NULL ni string vacío/solo espacios.
-- No hay longitud mínima ni validación de contenido: eso es criterio de
-- producto, no invariante de datos.
--
-- Alcance: solo INSERTs nuevos. Las propuestas históricas con menu_description
-- NULL quedan como están (no se borran ni se backfillean) — un CHECK sobre la
-- columna fallaría con esas filas y rompería la tabla.
--
-- Base: definición vigente de submit_proposal en MIGRATION_proposal_price_range.sql
-- (última de las tres que la definen: enforce_admin_block → proposal_price_snapshot
-- → proposal_price_range, verificado por grep). La firma de 5 parámetros ya fue
-- DROPeada en proposal_price_snapshot; acá la firma NO cambia (mismos 8
-- parámetros) → CREATE OR REPLACE seguro, sin DROP y sin riesgo de overload.
-- Cambios marcados con [MENU_REQUIRED].
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_proposal(
  p_request_id       uuid,
  p_message          text    DEFAULT NULL::text,
  p_menu_description text    DEFAULT NULL::text,
  p_price_total      numeric DEFAULT NULL::numeric,
  p_price_per_person numeric DEFAULT NULL::numeric,
  p_price_2          numeric DEFAULT NULL::numeric,
  p_price_3_6        numeric DEFAULT NULL::numeric,
  p_price_7_20       numeric DEFAULT NULL::numeric
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chef_id     uuid;
  v_blocked     boolean;
  v_proposal_id uuid;
  v_budget_min  numeric;
  v_budget_max  numeric;
  v_menu        text;     -- [MENU_REQUIRED]
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

  -- [MENU_REQUIRED] Descripción del menú obligatoria. Se guarda trimeada para
  -- que no entren strings de solo espacios por otra vía.
  v_menu := btrim(coalesce(p_menu_description, ''));
  if v_menu = '' then
    raise exception 'proposal_menu_required';
  end if;

  -- Precio dentro del presupuesto del request (celda tier×bracket ya persistida
  -- en budget_min/budget_max). Sin presupuesto no se valida.
  select budget_min, budget_max into v_budget_min, v_budget_max
  from service_requests
  where id = p_request_id;

  if v_budget_min is not null and v_budget_max is not null
     and p_price_per_person is not null
     and (p_price_per_person < v_budget_min or p_price_per_person > v_budget_max) then
    raise exception 'proposal_price_out_of_range';
  end if;

  insert into proposals (
    request_id, chef_id, message, menu_description, price_total, price_per_person,
    price_2, price_3_6, price_7_20
  )
  values (
    p_request_id, v_chef_id, p_message, v_menu, p_price_total, p_price_per_person,  -- [MENU_REQUIRED]
    p_price_2, p_price_3_6, p_price_7_20
  )
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$function$;

-- Refrescar el schema cache de PostgREST (firma sin cambios, pero por consistencia
-- con las demás migraciones de esta RPC).
NOTIFY pgrst, 'reload schema';
