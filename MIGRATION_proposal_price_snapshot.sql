-- ============================================================================
-- MIGRACIÓN · Snapshot de precios por bracket en la propuesta
--
-- Contexto: el precio de una propuesta sale del menú del chef según el bracket
-- de comensales del request (priceForGuests: ≤2 → price_2, 3–6 → price_3_6,
-- ≥7 → price_7_20). Pero la propuesta guardaba solo el price_per_person final:
-- si el cliente cambia los comensales en la reserva, no había forma de saber
-- el precio REAL del chef para el bracket nuevo — y el re-precio anterior
-- (factor 0.625 por bracket) inventaba precios que el chef nunca definió.
--
-- Qué hace:
--   1. proposals.price_2 / price_3_6 / price_7_20 — snapshot de los precios
--      del menú al momento de proponer. Nullable: propuestas históricas o sin
--      menú elegido no lo tienen → esas NO se re-precian (precio fijo).
--   2. submit_proposal() — acepta y guarda el snapshot. Cambia la firma, así
--      que se DROPea la versión vieja primero: CREATE OR REPLACE con más
--      parámetros crearía un OVERLOAD y PostgREST fallaría por ambigüedad.
--
-- Base: definición vigente de submit_proposal en MIGRATION_enforce_admin_block.sql
-- (única migración que la define, verificado por grep). Sin GRANTs explícitos
-- que preservar. Cambios marcados con [SNAPSHOT].
-- ============================================================================

-- ── 1 · Columnas ────────────────────────────────────────────────────────────
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS price_2    numeric;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS price_3_6  numeric;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS price_7_20 numeric;

-- ── 2 · RPC (firma nueva → DROP + CREATE) ───────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_proposal(uuid, text, text, numeric, numeric);

CREATE OR REPLACE FUNCTION public.submit_proposal(
  p_request_id       uuid,
  p_message          text    DEFAULT NULL::text,
  p_menu_description text    DEFAULT NULL::text,
  p_price_total      numeric DEFAULT NULL::numeric,
  p_price_per_person numeric DEFAULT NULL::numeric,
  p_price_2          numeric DEFAULT NULL::numeric,   -- [SNAPSHOT]
  p_price_3_6        numeric DEFAULT NULL::numeric,   -- [SNAPSHOT]
  p_price_7_20       numeric DEFAULT NULL::numeric    -- [SNAPSHOT]
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

  insert into proposals (
    request_id, chef_id, message, menu_description, price_total, price_per_person,
    price_2, price_3_6, price_7_20                                  -- [SNAPSHOT]
  )
  values (
    p_request_id, v_chef_id, p_message, p_menu_description, p_price_total, p_price_per_person,
    p_price_2, p_price_3_6, p_price_7_20                            -- [SNAPSHOT]
  )
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$function$;

-- Refrescar el schema cache de PostgREST para que la firma nueva sea visible
-- de inmediato (evita PGRST202 hasta el próximo reload).
NOTIFY pgrst, 'reload schema';
