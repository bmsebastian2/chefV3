-- ============================================================================
-- Fase 2 · Pieza 5 — Liberación del pago al chef
--
--   get_releasable_bookings()              → lista lo que YA se puede liberar
--   release_payout(p_booking_id, p_ref)    → el ADMIN marca el giro al chef
--
-- Guard de liberación (modelo escrow elegido):
--   · booking_status = 'completed'         (servicio realizado)
--   · payment_status = 'paid'              (no reembolsado/cancelado)
--   · payout_status  = 'pending'           (no liberado aún)
--   · completed_at + 3 días <= now()       (ventana sin disputa)
--
-- La transferencia es MANUAL: la DB solo trackea el estado. El admin hace el
-- giro real (chef_payout_amount = total − comisión) y luego llama release_payout
-- con la referencia. Admin-only (service_role); no se expone a authenticated.
-- ============================================================================

-- ── 1. Bookings listos para liberar (para el panel/operación del admin) ─────
CREATE OR REPLACE FUNCTION public.get_releasable_bookings()
RETURNS TABLE (
  booking_id         uuid,
  chef_id            uuid,
  request_id         uuid,
  total_amount       numeric,
  commission_amount  numeric,
  chef_payout_amount numeric,
  currency           text,
  completed_at       timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.chef_id, b.request_id,
    b.total_amount, b.commission_amount, b.chef_payout_amount,
    b.currency, b.completed_at
  FROM public.bookings b
  WHERE b.booking_status = 'completed'
    AND b.payment_status = 'paid'
    AND b.payout_status  = 'pending'
    AND b.completed_at IS NOT NULL
    AND b.completed_at <= now() - INTERVAL '3 days'
  ORDER BY b.completed_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_releasable_bookings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_releasable_bookings() TO service_role;

-- ── 2. Marcar el payout como liberado ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_payout(
  p_booking_id uuid,
  p_payout_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT booking_status, payment_status, payout_status, completed_at
    INTO v
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  -- Idempotencia: ya liberado → no hacer nada.
  IF v.payout_status = 'released' THEN
    RETURN;
  END IF;

  -- Guards del modelo escrow.
  IF v.booking_status <> 'completed' OR v.payment_status <> 'paid' OR v.payout_status <> 'pending' THEN
    RAISE EXCEPTION 'payout not applicable (booking=%, payment=%, payout=%)',
      v.booking_status, v.payment_status, v.payout_status;
  END IF;

  -- Ventana sin disputa: 3 días desde que se completó.
  IF v.completed_at IS NULL OR v.completed_at > now() - INTERVAL '3 days' THEN
    RAISE EXCEPTION 'payout_window_not_reached';
  END IF;

  UPDATE public.bookings
  SET payout_status = 'released',
      released_at   = now(),
      payout_ref    = p_payout_ref,
      updated_at    = now()
  WHERE id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_payout(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_payout(uuid, text) TO service_role;
