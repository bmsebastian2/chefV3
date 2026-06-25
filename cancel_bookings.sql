-- ============================================================================
-- Fase 2 · Pieza 4 — Cancelación + reembolso
--
--   cancel_booking(p_booking_id, p_reason)       → el CLIENTE cancela (≥15 días)
--   mark_refund_processed(p_booking_id, p_ref)   → el ADMIN marca el giro hecho
--
-- Modelo de reembolso (manual, simétrico al payout):
--   · cancel_booking deja booking_status='cancelled' y payment_status='paid'
--     → "reembolso debido": la plata sigue retenida, hay que devolverla.
--   · mark_refund_processed pasa payment_status='refunded' cuando el admin hace
--     el giro real (vía dLocalGo). La llamada de refund a la API de dLocalGo es
--     un paso OPERATIVO aparte: dlocalgo.ts hoy no tiene endpoint de refund.
--
-- Política: autoservicio del cliente solo si faltan ≥15 días para el evento
-- (coincide con el copy de BookingView). Dentro de los 15 días, la función
-- lanza 'cancellation_window_closed' → el cliente debe contactar soporte y la
-- cancela un admin manualmente.
-- ============================================================================

-- ── Columna para la referencia del reembolso (espejo de payout_ref) ─────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_ref text;

-- ── 1. Cancelación por el cliente ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_reason     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  -- Booking + verificación de propiedad + fecha del evento.
  SELECT b.id, b.request_id, b.booking_status, b.payment_status, sr.event_date_start
    INTO v
  FROM public.bookings b
  JOIN public.service_requests sr ON sr.id = b.request_id
  WHERE b.id = p_booking_id
    AND sr.user_id = auth.uid();

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found or not authorized';
  END IF;

  -- Idempotencia: ya cancelado → no hacer nada.
  IF v.booking_status = 'cancelled' THEN
    RETURN;
  END IF;

  -- No se cancela un servicio ya completado.
  IF v.booking_status <> 'confirmed' THEN
    RAISE EXCEPTION 'booking not cancellable (status=%)', v.booking_status;
  END IF;

  -- Política de ventana: autoservicio solo con ≥15 días de anticipación.
  IF v.event_date_start < CURRENT_DATE + 15 THEN
    RAISE EXCEPTION 'cancellation_window_closed';
  END IF;

  -- Cancelar. payment_status queda 'paid' = reembolso debido (lo cierra el admin).
  UPDATE public.bookings
  SET booking_status = 'cancelled',
      cancelled_at   = now(),
      cancel_reason  = p_reason,
      updated_at     = now()
  WHERE id = p_booking_id;

  -- Sincronizar la solicitud.
  UPDATE public.service_requests
  SET status        = 'cancelled',
      cancel_reason  = COALESCE(p_reason, 'Cancelada por el cliente'),
      cancelled_at   = now()
  WHERE id = v.request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO service_role;

-- ── 2. Cierre del reembolso por el admin ────────────────────────────────────
-- Se llama DESPUÉS de ejecutar el giro real en dLocalGo. Admin-only (service_role).
CREATE OR REPLACE FUNCTION public.mark_refund_processed(
  p_booking_id uuid,
  p_refund_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT booking_status, payment_status INTO v
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  -- Idempotencia.
  IF v.payment_status = 'refunded' THEN
    RETURN;
  END IF;

  -- Solo se reembolsa un booking cancelado con plata todavía retenida.
  IF v.booking_status <> 'cancelled' OR v.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'refund not applicable (status=%, payment=%)',
      v.booking_status, v.payment_status;
  END IF;

  UPDATE public.bookings
  SET payment_status = 'refunded',
      refund_ref     = p_refund_ref,
      updated_at     = now()
  WHERE id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_refund_processed(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_refund_processed(uuid, text) TO service_role;
