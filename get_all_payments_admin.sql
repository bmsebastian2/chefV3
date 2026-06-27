-- ============================================================================
-- Panel admin · Pagos (ciclo completo) — get_all_payments_admin()
--
-- Da VISIBILIDAD TEMPRANA: a diferencia de get_releasable_bookings /
-- get_released_bookings (que solo muestran las etapas finales), esta RPC trae
-- TODOS los pagos desde que entran por dLocalGo, en cualquier estado del ciclo.
--
-- Base = `payments` (toda entrada de dinero, incluso la que nunca llegó a
-- booking). `bookings` se suma con LEFT JOIN para aportar el estado de escrow
-- cuando existe. Es LECTURA PURA: no toca ninguna lógica de pago ni las otras
-- RPCs del admin.
--
-- Join payments↔bookings: bookings.payment_ref = payments.dlocalgo_payment_id
-- (así lo setea create_booking_for_payment, columna `payment_ref`).
--
-- `lifecycle_state` se deriva acá (server-side) para que el front no duplique la
-- lógica de estados. Estados posibles:
--   pending        · dinero iniciado en dLocalGo, sin confirmar, sin booking
--   failed         · rechazado/expirado/cancelado por la pasarela, sin booking
--   orphan         · pago confirmado (completed) SIN booking (huérfano por el
--                    guard de doble-reserva) → el admin debe reembolsar a mano
--   escrow_held    · pagado, dinero retenido, esperando que el cliente confirme
--   in_window      · cliente confirmó, corriendo la ventana de 3 días sin disputa
--   releasable     · confirmado + pasaron los 3 días → listo para liberar
--   released       · ya girado al chef
--   refund_pending · booking cancelado, plata todavía retenida → a reembolsar
--   refunded       · booking cancelado y ya reembolsado
--
-- Admin-only: SECURITY DEFINER (bypassa RLS) + REVOKE PUBLIC + GRANT service_role.
-- Se invoca con el admin client desde /admin (layout ya exige users.role='admin').
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_payments_admin()
RETURNS TABLE (
  payment_id          uuid,
  dlocalgo_payment_id text,
  request_id          uuid,
  proposal_id         uuid,
  -- Identidad
  chef_id             uuid,
  chef_name           text,
  client_name         text,
  client_email        text,
  service_type        text,
  occasion            text,
  city                text,
  -- Montos (amount es el autoritativo de payments; comisión/neto vienen del booking)
  amount              numeric,
  currency            text,
  commission_amount   numeric,
  chef_payout_amount  numeric,
  -- Estados crudos
  payment_status      text,    -- payments.status: pending/completed/failed/...
  booking_status      text,    -- bookings.booking_status: confirmed/completed/cancelled
  booking_pay_status  text,    -- bookings.payment_status: paid/refunded
  payout_status       text,    -- bookings.payout_status: pending/released/failed
  -- Fechas del ciclo de vida
  payment_created_at  timestamptz,   -- cuándo se inició el pago (fecha del pago)
  confirmed_at        timestamptz,   -- cuándo quedó PAID (escrow abierto)
  completed_at        timestamptz,   -- cuándo el cliente/job marcó completado
  released_at         timestamptz,
  cancelled_at        timestamptz,
  -- Derivados para el panel
  lifecycle_state     text,
  client_confirmed    boolean        -- ¿el servicio quedó completado?
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
    -- ── Estado del ciclo (orden de prioridad: del final al inicio) ──
    CASE
      WHEN b.payout_status = 'released'                                  THEN 'released'
      WHEN b.booking_status = 'cancelled' AND b.payment_status = 'refunded' THEN 'refunded'
      WHEN b.booking_status = 'cancelled' AND b.payment_status = 'paid'  THEN 'refund_pending'
      WHEN b.booking_status = 'completed' AND b.payout_status = 'pending'
           AND b.completed_at IS NOT NULL
           AND b.completed_at <= now() - INTERVAL '3 days'               THEN 'releasable'
      WHEN b.booking_status = 'completed' AND b.payout_status = 'pending' THEN 'in_window'
      WHEN b.booking_status = 'confirmed' AND b.payment_status = 'paid'  THEN 'escrow_held'
      -- Sin booking:
      WHEN b.id IS NULL AND p.status = 'completed'                       THEN 'orphan'
      WHEN b.id IS NULL AND p.status = 'pending'                         THEN 'pending'
      WHEN b.id IS NULL AND p.status IN ('failed', 'expired', 'cancelled') THEN 'failed'
      ELSE COALESCE(p.status, 'unknown')
    END                                            AS lifecycle_state,
    (b.booking_status = 'completed')               AS client_confirmed
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
