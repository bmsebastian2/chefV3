-- ============================================================================
-- Panel admin — exponer el PROVEEDOR y el id reembolsable de cada pago
--
-- CÓMO USAR: pegar en el SQL Editor de Supabase y ejecutar una vez.
-- ⚠️ CORRER ESTE SQL **ANTES** DE DESPLEGAR EL FRONT. Al revés, el front pide
-- campos que la función todavía no devuelve y la sección de pagos rompe.
--
-- Motivo: con dos pasarelas, el admin necesita saber DÓNDE reembolsar (panel de
-- dLocalGo o de PayPal) y CON QUÉ id buscar la transacción. Hoy las RPCs
-- devuelven `dlocalgo_payment_id` pero ni siquiera se renderiza, así que el
-- admin no tiene identificador alguno.
--
-- Ojo con el id de PayPal: para reembolsar NO sirve el order id (que es lo que
-- guardamos en dlocalgo_payment_id) sino el CAPTURE id. Por eso se expone
-- `provider_capture_id` aparte: entregarle al admin el order id sería darle un
-- dato con el que PayPal no lo deja reembolsar.
--
-- DROP + CREATE (no CREATE OR REPLACE) porque cambia el tipo de retorno.
-- Mismo patrón que MIGRATION_admin_refunds_2_bookingid.sql: el DROP y el CREATE
-- corren en la misma transacción del editor, así que no hay ventana sin función.
-- ============================================================================


-- ── BLOQUE 1 · get_pending_refunds_admin ────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_pending_refunds_admin();

CREATE OR REPLACE FUNCTION public.get_pending_refunds_admin()
RETURNS TABLE (
  kind                text,        -- 'booking' | 'orphan'
  id                  uuid,        -- booking_id | payment_id (el que procesa la acción)
  request_id          uuid,
  dlocalgo_payment_id text,
  client_name         text,
  client_email        text,
  amount              numeric,
  currency            text,
  cancelled_at        timestamptz, -- solo bookings
  cancel_reason       text,
  created_at          timestamptz, -- fecha del pago (para ordenar huérfanos)
  provider            text,        -- NUEVO: 'dlocalgo' | 'paypal' → a qué panel ir
  provider_capture_id text         -- NUEVO: solo PayPal, id con el que se reembolsa
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- El UNION va envuelto en una subconsulta para poder ordenar POR NOMBRE.
  -- Antes era `ORDER BY 11 ASC` (posicional): agregar cualquier columna corría
  -- el ordinal y rompía el orden EN SILENCIO, sin error. Trampa desactivada.
  SELECT * FROM (

    -- Bookings cancelados con plata todavía retenida.
    SELECT
      'booking'::text                                      AS kind,
      b.id                                                 AS id,
      b.request_id                                         AS request_id,
      b.payment_ref                                        AS dlocalgo_payment_id,
      COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente')  AS client_name,
      ci.email                                             AS client_email,
      b.total_amount                                       AS amount,
      b.currency                                           AS currency,
      b.cancelled_at                                       AS cancelled_at,
      b.cancel_reason                                      AS cancel_reason,
      b.confirmed_at                                       AS created_at,
      -- El booking no guarda el proveedor: sale del pago que lo originó, que se
      -- ata por payment_ref = dlocalgo_payment_id. COALESCE por si el pago no
      -- estuviera (no debería): un booking sin pago se asume dLocalGo, que es
      -- todo lo histórico.
      COALESCE(pay.provider, 'dlocalgo')                   AS provider,
      pay.provider_capture_id                              AS provider_capture_id
    FROM public.bookings b
    LEFT JOIN public.request_contact_info ci ON ci.request_id = b.request_id
    LEFT JOIN public.payments pay            ON pay.dlocalgo_payment_id = b.payment_ref
    WHERE b.booking_status = 'cancelled'
      AND b.payment_status = 'paid'
      AND b.payout_status <> 'released'

    UNION ALL

    -- Pagos huérfanos: completed, sin booking, aún no reembolsados.
    SELECT
      'orphan'::text,
      p.id,
      p.request_id,
      p.dlocalgo_payment_id,
      COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente'),
      ci.email,
      p.amount,
      p.currency,
      NULL::timestamptz,
      'Pago sin reserva (huérfano)'::text,
      p.created_at,
      p.provider,
      p.provider_capture_id
    FROM public.payments p
    LEFT JOIN public.request_contact_info ci ON ci.request_id = p.request_id
    WHERE p.status = 'completed'
      AND p.refund_status <> 'refunded'
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b WHERE b.payment_ref = p.dlocalgo_payment_id
      )

  ) t
  ORDER BY t.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_pending_refunds_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_refunds_admin() TO service_role;


-- ── BLOQUE 2 · get_all_payments_admin ───────────────────────────────────────
-- Idéntica a MIGRATION_admin_refunds_2_bookingid.sql salvo las dos columnas
-- nuevas al final del RETURNS TABLE y del SELECT.
DROP FUNCTION IF EXISTS public.get_all_payments_admin();

CREATE OR REPLACE FUNCTION public.get_all_payments_admin()
RETURNS TABLE (
  payment_id          uuid,
  dlocalgo_payment_id text,
  request_id          uuid,
  proposal_id         uuid,
  booking_id          uuid,
  chef_id             uuid,
  chef_name           text,
  client_name         text,
  client_email        text,
  service_type        text,
  occasion            text,
  city                text,
  amount              numeric,
  currency            text,
  commission_amount   numeric,
  chef_payout_amount  numeric,
  payment_status      text,
  booking_status      text,
  booking_pay_status  text,
  payout_status       text,
  payment_created_at  timestamptz,
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  released_at         timestamptz,
  cancelled_at        timestamptz,
  lifecycle_state     text,
  client_confirmed    boolean,
  provider            text,        -- NUEVO
  provider_capture_id text         -- NUEVO
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.dlocalgo_payment_id,
    p.request_id,
    p.proposal_id,
    b.id                                           AS booking_id,
    b.chef_id,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.first_surname)), ''),
      CASE WHEN b.chef_id IS NOT NULL THEN 'Chef' END
    )                                              AS chef_name,
    COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente') AS client_name,
    ci.email                                       AS client_email,
    sr.service_type,
    sr.occasion,
    sr.city,
    p.amount,
    COALESCE(p.currency, b.currency, 'USD')        AS currency,
    b.commission_amount,
    b.chef_payout_amount,
    p.status                                       AS payment_status,
    b.booking_status,
    b.payment_status                               AS booking_pay_status,
    b.payout_status,
    p.created_at                                   AS payment_created_at,
    b.confirmed_at,
    b.completed_at,
    b.released_at,
    b.cancelled_at,
    CASE
      WHEN b.payout_status = 'released'                                  THEN 'released'
      WHEN b.booking_status = 'cancelled' AND b.payment_status = 'refunded' THEN 'refunded'
      WHEN b.booking_status = 'cancelled' AND b.payment_status = 'paid'  THEN 'refund_pending'
      WHEN b.booking_status = 'completed' AND b.payout_status = 'pending'
           AND b.completed_at IS NOT NULL
           AND b.completed_at <= now() - INTERVAL '3 days'               THEN 'releasable'
      WHEN b.booking_status = 'completed' AND b.payout_status = 'pending' THEN 'in_window'
      WHEN b.booking_status = 'confirmed' AND b.payment_status = 'paid'  THEN 'escrow_held'
      WHEN b.id IS NULL AND p.status = 'completed'                       THEN 'orphan'
      WHEN b.id IS NULL AND p.status = 'pending'                         THEN 'pending'
      WHEN b.id IS NULL AND p.status IN ('failed', 'expired', 'cancelled') THEN 'failed'
      ELSE COALESCE(p.status, 'unknown')
    END                                            AS lifecycle_state,
    (b.booking_status = 'completed')               AS client_confirmed,
    p.provider,
    p.provider_capture_id
  FROM public.payments p
  LEFT JOIN public.bookings b              ON b.payment_ref = p.dlocalgo_payment_id
  LEFT JOIN public.chef_profiles cp        ON cp.id = b.chef_id
  LEFT JOIN public.users cu                ON cu.id = cp.user_id
  LEFT JOIN public.service_requests sr     ON sr.id = p.request_id
  LEFT JOIN public.request_contact_info ci ON ci.request_id = p.request_id
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_all_payments_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_all_payments_admin() TO service_role;


-- ── VERIFICACIÓN ────────────────────────────────────────────────────────────
-- SELECT provider, provider_capture_id, dlocalgo_payment_id, payment_status
-- FROM public.get_all_payments_admin() LIMIT 5;
--   → el pago PayPal de prueba debe salir con provider='paypal' y capture id.
-- SELECT kind, provider, provider_capture_id FROM public.get_pending_refunds_admin();
--   → hoy probablemente vacío (no hay reembolsos pendientes).
