-- ============================================================================
-- MIGRACIÓN · Backstop de rango de precio en la propuesta
--
-- Contexto: el precio de una propuesta lo elige el chef DENTRO del rango del
-- tier × bracket que pidió el cliente (modelo "chef elige en rango", lib/pricing
-- → proposalPriceRange). La validación autoritativa vive en el server action
-- submitProposal(), pero un chef autenticado podría llamar submit_proposal()
-- directo por PostgREST y saltearla. Este backstop cierra ese hueco EN la RPC.
--
-- Regla: si el request tiene presupuesto (budget_min/budget_max), el precio por
-- persona propuesto debe caer dentro de [budget_min, budget_max]. Ese par ES la
-- celda tier × bracket que el wizard guardó desde la tabla oficial (lib/pricing),
-- así que el rango ya está PERSISTIDO en el request: acá NO se hardcodea ningún
-- número de precio ni se replica la tabla — solo se leen las columnas del request.
--
-- Nota sobre requests inconsistentes/históricos: si budget_min/budget_max no
-- corresponden al bracket real de los comensales (dato viejo/inconsistente), el
-- server action los trata como legacy (precio libre del menú) y NO valida rango;
-- este backstop, en cambio, igual exige el precio dentro del presupuesto guardado
-- ("no proponer fuera de lo que el cliente presupuestó"), que es una regla válida
-- en todos los casos. Requests sin presupuesto (budget NULL) no se chequean.
--
-- Base: definición vigente de submit_proposal en MIGRATION_proposal_price_snapshot.sql
-- (última que la define, verificado por grep). Firma SIN cambios (mismos 8
-- parámetros) → CREATE OR REPLACE seguro, sin DROP (no hay overload).
-- Cambios marcados con [PRICE_RANGE].
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
  v_budget_min  numeric;   -- [PRICE_RANGE]
  v_budget_max  numeric;   -- [PRICE_RANGE]
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

  -- [PRICE_RANGE] Precio dentro del presupuesto del request (celda tier×bracket
  -- ya persistida en budget_min/budget_max). Sin presupuesto no se valida.
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
    p_request_id, v_chef_id, p_message, p_menu_description, p_price_total, p_price_per_person,
    p_price_2, p_price_3_6, p_price_7_20
  )
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$function$;

-- Refrescar el schema cache de PostgREST (firma sin cambios, pero por consistencia
-- con las demás migraciones de esta RPC).
NOTIFY pgrst, 'reload schema';
