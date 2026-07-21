-- ============================================================================
-- DELTA — get_all_payments_admin() ahora devuelve chef_blocked
--
-- Motivo: al cancelar en bloque las reservas de un chef bloqueado (cancel_
-- Chef_bookings_and_refund), la pestaña "Pagos" no daba ninguna pista de POR
-- QUÉ un pago pasó a 'refund_pending' — el admin tenía que cruzar manualmente
-- con la pestaña "Chefs". `chef_profiles` ya se joinea en esta RPC (alias cp,
-- para chef_name); solo se agrega la columna, ningún join nuevo.
--
-- ⚠️ CORRECCIÓN: la primera versión de este archivo se basó en el esquema de
-- MIGRATION_admin_refunds_2_bookingid.sql y por error OMITÍA `provider` /
-- `provider_capture_id` (agregadas después por MIGRATION_paypal_admin_provider.
-- sql). Si ya corriste la versión vieja de este archivo, volvé a correr ESTA:
-- restaura esas dos columnas (por eso todo pago aparecía como "dlocalgo") y
-- suma chef_blocked. Base real = MIGRATION_paypal_admin_provider.sql (BLOQUE 2),
-- que es la definición más reciente de esta función.
--
-- IDEMPOTENTE. Pegar en el SQL Editor y ejecutar una vez. Se DROPea primero
-- porque cambia el tipo de retorno.
-- ============================================================================

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
  chef_blocked        boolean,     -- NUEVO
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
  provider            text,
  provider_capture_id text
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
    COALESCE(cp.admin_blocked, false)              AS chef_blocked,
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
-- SELECT provider, provider_capture_id, chef_blocked, dlocalgo_payment_id
-- FROM public.get_all_payments_admin() LIMIT 5;
--   → los pagos de PayPal deben volver a salir con provider='paypal'.
