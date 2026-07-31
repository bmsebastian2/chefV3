-- ============================================================================
-- MIGRACIÓN · Liberación de pagos al chef: referencia obligatoria, auditoría de
-- autor y pestaña "Pagados" (histórico paginado)
--
-- Cierra 4 huecos del flujo de payout, que hasta ahora era el único movimiento
-- de dinero del panel SIN las garantías que ya tienen los reembolsos:
--
--   A) La referencia del giro era OPCIONAL (los reembolsos la exigen desde
--      MIGRATION_admin_refunds.sql). Ahora es obligatoria: sin comprobante no se
--      marca plata como girada.
--   B) No se registraba QUÉ admin liberó → nueva columna released_by, mismo
--      patrón que refunded_by / admin_blocked_by.
--   C) La idempotencia era un RETURN mudo: re-marcar un booking ya liberado
--      devolvía éxito sin hacer nada y perdía la referencia nueva en silencio.
--      Ahora levanta 'payout_already_released' con su ref y fecha. Sigue siendo
--      idempotente en lo que importa (jamás re-escribe ni re-libera), pero el
--      admin se entera.
--   D) El histórico se leía con get_released_bookings() SIN límite en cada carga
--      de /admin. Nueva get_released_payouts_admin(): paginada por mes y con los
--      agregados calculados en SQL (antes se sumaban en TS sobre el listado
--      completo — al paginar, eso daría totales de la página, no del mes).
--
-- NO toca el flujo de reembolsos ni el de cobro al cliente.
--
-- Base: definición vigente de release_payout / get_releasable_bookings en
-- release_payout.sql, idéntica a la copia del BLOQUE 9 de
-- MIGRATION_bookings_escrow_PROD.sql (verificado línea por línea).
--
-- ⚠️ Al re-correr MIGRATION_bookings_escrow_PROD.sql entero se revierten estas
--    dos funciones a la versión vieja. Si eso pasa, volver a correr ESTE archivo.
--
-- Orden de deploy: correr este SQL ANTES de deployar el código. release_payout
-- cambia de firma (2 → 3 argumentos), así que entre el DROP y el deploy el botón
-- "Marcar girado" del panel falla.
-- ============================================================================


-- ── 1. Auditoría: quién liberó ──────────────────────────────────────────────
-- Sin FK, igual que refunded_by (MIGRATION_admin_refunds.sql): es un registro de
-- auditoría, no debe bloquear el borrado de un usuario.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS released_by uuid;   -- users.id del admin que giró

COMMENT ON COLUMN public.bookings.released_by IS
  'users.id del admin que marcó el giro al chef (auditoría, junto a released_at y payout_ref).';


-- ── 2. release_payout: ref obligatoria + autor + ya-liberado explícito ───────
-- DROP + CREATE, no CREATE OR REPLACE: cambiar la cantidad de argumentos crea un
-- OVERLOAD nuevo en vez de reemplazar, y quedarían dos versiones vivas (la vieja
-- sin auditoría, llamable por PostgREST).
DROP FUNCTION IF EXISTS public.release_payout(uuid, text);

CREATE OR REPLACE FUNCTION public.release_payout(
  p_booking_id uuid,
  p_payout_ref text,
  p_admin_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT booking_status, payment_status, payout_status, completed_at,
         payout_ref, released_at
    INTO v
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  -- [C] Ya liberado: no se re-marca NUNCA (un giro no se hace dos veces). A
  -- diferencia de la versión anterior, se avisa en vez de devolver éxito mudo.
  IF v.payout_status = 'released' THEN
    RAISE EXCEPTION 'payout_already_released (ref=%, at=%)',
      COALESCE(v.payout_ref, '—'), COALESCE(v.released_at::text, '—');
  END IF;

  -- [A] Referencia del giro obligatoria (texto libre: cada banco tiene su
  -- formato). Mismo guard que mark_refund_processed.
  IF p_payout_ref IS NULL OR btrim(p_payout_ref) = '' THEN
    RAISE EXCEPTION 'payout_ref_required';
  END IF;

  -- Guards del modelo escrow (sin cambios).
  IF v.booking_status <> 'completed' OR v.payment_status <> 'paid' OR v.payout_status <> 'pending' THEN
    RAISE EXCEPTION 'payout not applicable (booking=%, payment=%, payout=%)',
      v.booking_status, v.payment_status, v.payout_status;
  END IF;

  -- Ventana sin disputa: 3 días desde que se completó (sin cambios).
  IF v.completed_at IS NULL OR v.completed_at > now() - INTERVAL '3 days' THEN
    RAISE EXCEPTION 'payout_window_not_reached';
  END IF;

  UPDATE public.bookings
  SET payout_status = 'released',
      released_at   = now(),
      payout_ref    = btrim(p_payout_ref),
      released_by   = p_admin_id,   -- [B]
      updated_at    = now()
  WHERE id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_payout(uuid, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_payout(uuid, text, uuid) TO service_role;


-- ── 3. get_releasable_bookings: sumar si el chef tiene datos bancarios ──────
-- El admin transfiere por fuera, así que la falta de datos bancarios NO bloquea
-- la liberación (puede tenerlos por otro canal) — pero el panel tiene que
-- advertirlo antes de que marque un giro que quizá no pudo hacer.
-- DROP obligatorio: cambia el RETURNS TABLE (CREATE OR REPLACE no puede alterar
-- el tipo de retorno de una función existente).
DROP FUNCTION IF EXISTS public.get_releasable_bookings();

CREATE OR REPLACE FUNCTION public.get_releasable_bookings()
RETURNS TABLE (
  booking_id         uuid,
  chef_id            uuid,
  request_id         uuid,
  total_amount       numeric,
  commission_amount  numeric,
  chef_payout_amount numeric,
  currency           text,
  completed_at       timestamptz,
  has_payout_account boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.chef_id, b.request_id,
    b.total_amount, b.commission_amount, b.chef_payout_amount,
    b.currency, b.completed_at,
    -- "Tiene datos bancarios" = existe la fila Y trae número de cuenta cargado.
    -- Una fila a medio completar no sirve para transferir.
    (pa.chef_id IS NOT NULL AND COALESCE(btrim(pa.account_number), '') <> '') AS has_payout_account
  FROM public.bookings b
  LEFT JOIN public.chef_payout_accounts pa ON pa.chef_id = b.chef_id
  WHERE b.booking_status = 'completed'
    AND b.payment_status = 'paid'
    AND b.payout_status  = 'pending'
    AND b.completed_at IS NOT NULL
    AND b.completed_at <= now() - INTERVAL '3 days'
  ORDER BY b.completed_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_releasable_bookings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_releasable_bookings() TO service_role;


-- ── 4. Histórico de pagos liberados, paginado por mes ───────────────────────
-- Reemplaza a get_released_bookings() (que queda deprecada, ver abajo) para
-- alimentar la pestaña "Pagados" con carga lazy.
--
-- Devuelve un único jsonb con cinco llaves:
--   • month   : mes efectivamente resuelto ('YYYY-MM') — p_month si tiene datos,
--               si no el más reciente con liberaciones; NULL si no hay ninguna
--   • rows    : LOTE paginado de liberaciones DE ESE MES (released_at DESC)
--   • total   : liberaciones del mes (para saber si quedan más lotes)
--   • months  : todos los meses con liberaciones, desc — alimenta el selector
--   • summary : agregados DEL MES resuelto (no de la página) + tendencia:
--                 total_net / total_commission / released_count / avg_net
--                 top_chef  · {name, count, net} — el "chef del mes"
--                 trend     · [{key, total}] últimos 6 meses con datos, asc
--
-- El mes se deriva con to_char(released_at, 'YYYY-MM') en la timezone de la
-- sesión (UTC en Supabase). Antes se agrupaba en TS con new Date(), o sea en la
-- timezone del server de Next: una liberación de los últimos/primeros minutos
-- del mes puede cambiar de casillero respecto de la vista anterior. Es
-- consistente consigo misma, que es lo que importa para cuadrar los totales.
--
-- Admin-only: SECURITY DEFINER (bypassa RLS) + REVOKE PUBLIC + GRANT service_role.
-- Se invoca con el admin client desde una server action que valida users.role='admin'.
CREATE OR REPLACE FUNCTION public.get_released_payouts_admin(
  p_month  text    DEFAULT NULL,
  p_limit  integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month   text;
  v_rows    jsonb;
  v_total   integer;
  v_months  jsonb;
  v_summary jsonb;
BEGIN
  -- ── Meses con liberaciones (desc) ──
  SELECT COALESCE(jsonb_agg(m ORDER BY m DESC), '[]'::jsonb)
  INTO v_months
  FROM (
    SELECT DISTINCT to_char(b.released_at, 'YYYY-MM') AS m
    FROM public.bookings b
    WHERE b.payout_status = 'released' AND b.released_at IS NOT NULL
  ) x;

  -- ── Mes a mostrar: el pedido si tiene datos, si no el más reciente ──
  SELECT CASE
    WHEN p_month IS NOT NULL AND v_months ? p_month THEN p_month
    ELSE v_months ->> 0
  END
  INTO v_month;

  -- Sin liberaciones todavía: payload vacío coherente.
  IF v_month IS NULL THEN
    RETURN jsonb_build_object(
      'month', NULL, 'rows', '[]'::jsonb, 'total', 0, 'months', v_months,
      'summary', jsonb_build_object(
        'total_net', 0, 'total_commission', 0, 'released_count', 0, 'avg_net', 0,
        'top_chef', NULL, 'trend', '[]'::jsonb
      )
    );
  END IF;

  -- ── Lote paginado del mes ──
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.released_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      b.id      AS booking_id,
      b.chef_id,
      COALESCE(
        NULLIF(btrim(CONCAT_WS(' ', cu.first_name, cu.first_surname)), ''),
        'Chef'
      )                                                     AS chef_name,
      COALESCE(NULLIF(btrim(ci.full_name), ''), 'Cliente')  AS client_name,
      ci.email                                              AS client_email,
      sr.service_type,
      sr.occasion,
      sr.city,
      b.total_amount,
      b.commission_amount,
      b.chef_payout_amount,
      b.currency,
      b.completed_at,
      b.released_at,
      b.payout_ref,
      -- Auditoría visible: quién marcó el giro. NULL en las liberaciones
      -- anteriores a esta migración (released_by no existía).
      b.released_by,
      NULLIF(btrim(CONCAT_WS(' ', au.first_name, au.first_surname)), '') AS released_by_name
    FROM public.bookings b
    LEFT JOIN public.chef_profiles cp        ON cp.id = b.chef_id
    LEFT JOIN public.users cu                ON cu.id = cp.user_id
    LEFT JOIN public.service_requests sr     ON sr.id = b.request_id
    LEFT JOIN public.request_contact_info ci ON ci.request_id = b.request_id
    LEFT JOIN public.users au                ON au.id = b.released_by
    WHERE b.payout_status = 'released'
      AND b.released_at IS NOT NULL
      AND to_char(b.released_at, 'YYYY-MM') = v_month
    ORDER BY b.released_at DESC
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0)
  ) t;

  -- ── Total del mes ──
  SELECT count(*)
  INTO v_total
  FROM public.bookings b
  WHERE b.payout_status = 'released'
    AND b.released_at IS NOT NULL
    AND to_char(b.released_at, 'YYYY-MM') = v_month;

  -- ── Agregados DEL MES (sobre todas sus filas, no sobre la página) ──
  SELECT jsonb_build_object(
    'total_net',        COALESCE(SUM(b.chef_payout_amount), 0),
    'total_commission', COALESCE(SUM(b.commission_amount), 0),
    'released_count',   COUNT(*)::int,
    'avg_net',          COALESCE(AVG(b.chef_payout_amount), 0),
    'top_chef', (
      SELECT jsonb_build_object('name', g.name, 'count', g.cnt, 'net', g.net)
      FROM (
        SELECT
          COALESCE(
            NULLIF(btrim(CONCAT_WS(' ', cu2.first_name, cu2.first_surname)), ''),
            'Chef'
          )                              AS name,
          count(*)::int                  AS cnt,
          SUM(b2.chef_payout_amount)     AS net
        FROM public.bookings b2
        LEFT JOIN public.chef_profiles cp2 ON cp2.id = b2.chef_id
        LEFT JOIN public.users cu2         ON cu2.id = cp2.user_id
        WHERE b2.payout_status = 'released'
          AND b2.released_at IS NOT NULL
          AND to_char(b2.released_at, 'YYYY-MM') = v_month
        GROUP BY b2.chef_id, cu2.first_name, cu2.first_surname
        ORDER BY net DESC
        LIMIT 1
      ) g
    ),
    -- Tendencia: últimos 6 meses CON liberaciones, ascendente (el gráfico
    -- de barras los lee de izquierda a derecha).
    'trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('key', s.k, 'total', s.t) ORDER BY s.k ASC), '[]'::jsonb)
      FROM (
        SELECT to_char(b3.released_at, 'YYYY-MM') AS k,
               SUM(b3.chef_payout_amount)         AS t
        FROM public.bookings b3
        WHERE b3.payout_status = 'released' AND b3.released_at IS NOT NULL
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 6
      ) s
    )
  )
  INTO v_summary
  FROM public.bookings b
  WHERE b.payout_status = 'released'
    AND b.released_at IS NOT NULL
    AND to_char(b.released_at, 'YYYY-MM') = v_month;

  RETURN jsonb_build_object(
    'month',   v_month,
    'rows',    v_rows,
    'total',   v_total,
    'months',  v_months,
    'summary', v_summary
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_released_payouts_admin(text, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_released_payouts_admin(text, integer, integer) TO service_role;


-- ── 5. get_released_bookings: DEPRECADA ─────────────────────────────────────
-- Ya no la llama nadie (la pestaña "Pagados" usa get_released_payouts_admin).
-- Se deja viva a propósito: borrarla no aporta nada y sirve para consultas
-- sueltas del histórico completo sin paginar.
COMMENT ON FUNCTION public.get_released_bookings() IS
  'DEPRECADA — reemplazada por get_released_payouts_admin(month, limit, offset), que pagina y agrega por mes. Se conserva para consultas manuales del histórico completo.';


-- Refrescar el schema cache de PostgREST: release_payout cambió de firma y hay
-- una función nueva. Sin esto, las llamadas fallan con PGRST202.
NOTIFY pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional, correr después)
-- ─────────────────────────────────────────────────────────────────────────────
-- Que quedó UNA sola versión de release_payout, con 3 argumentos:
--   SELECT p.oid::regprocedure
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'release_payout';
--
-- Pendientes de liberar, ahora con el flag de datos bancarios:
--   SELECT * FROM public.get_releasable_bookings();
--
-- Primer lote del mes más reciente + agregados:
--   SELECT public.get_released_payouts_admin(NULL, 20, 0);
--
-- Un mes puntual:
--   SELECT public.get_released_payouts_admin('2026-07', 20, 0);
