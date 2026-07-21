-- ============================================================================
-- DELTA — admin_cancel_booking() ahora registra QUIÉN canceló
--
-- Motivo: admin_cancel_booking(p_booking_id, p_reason, p_admin_id) siempre
-- aceptó p_admin_id, pero el UPDATE nunca lo escribía en ningún lado — cancel_
-- reason y cancelled_at ya quedaban, pero no había rastro del admin que decidió
-- la cancelación (distinto de refunded_by, que audita el CIERRE del giro, no
-- la decisión de cancelar). Lo necesita la acción nueva "cancelar y reembolsar
-- reservas" de un chef bloqueado.
--
-- IDEMPOTENTE. Pegar en el SQL Editor y ejecutar una vez.
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;   -- users.id del admin que canceló

CREATE OR REPLACE FUNCTION public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason     text,
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
  SELECT booking_status, payment_status, payout_status, request_id
    INTO v
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  -- Idempotencia: ya cancelado → no hacer nada.
  IF v.booking_status = 'cancelled' THEN
    RETURN;
  END IF;

  -- No se cancela algo cuyo pago ya se giró al chef.
  IF v.payout_status = 'released' THEN
    RAISE EXCEPTION 'cannot_cancel_released_payout';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at   = now(),
      cancelled_by   = p_admin_id,
      cancel_reason  = COALESCE(p_reason, 'Cancelada por administración'),
      updated_at     = now()
  WHERE id = p_booking_id;

  -- Sincronizar la solicitud (misma lógica que cancel_booking del cliente).
  UPDATE public.service_requests
  SET status        = 'cancelled',
      cancel_reason  = COALESCE(p_reason, 'Cancelada por administración'),
      cancelled_at   = now()
  WHERE id = v.request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_booking(uuid, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_cancel_booking(uuid, text, uuid) TO service_role;

-- ── VERIFICACIÓN (opcional) ─────────────────────────────────────────────────
-- SELECT id, booking_status, cancelled_at, cancelled_by, cancel_reason
-- FROM public.bookings WHERE booking_status = 'cancelled' ORDER BY cancelled_at DESC LIMIT 5;
