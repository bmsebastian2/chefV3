-- ============================================================================
-- MIGRACIÓN — Gestión de reembolsos desde el panel admin
--
-- CÓMO USAR: pegar TODO este archivo en el SQL Editor de Supabase y ejecutar
-- una sola vez. Todo es IDEMPOTENTE (se puede re-correr sin romper).
--
-- Cierra 3 huecos del flujo de reembolso (el marcado ya existía):
--   A) El admin no podía CANCELAR un booking dentro de la ventana de 15 días
--      → no había forma de generar un "refund_pending". admin_cancel_booking().
--   B) Un pago 'completed' SIN booking (huérfano por el guard de doble-reserva)
--      no tenía ruta de reembolso → refund_* en `payments` + mark_orphan_...().
--   D) No había auditoría de quién/cuándo reembolsó → refunded_at + refunded_by.
--
-- Alcance: SOLO reembolso 100% (total). El parcial (50% de Términos) queda fuera.
-- La transferencia sigue siendo MANUAL (dLocalGo no expone API de refund): estas
-- RPCs solo trackean estado. La referencia del giro es OBLIGATORIA al cerrar.
-- Admin-only: todas SECURITY DEFINER + REVOKE PUBLIC + GRANT service_role.
-- ============================================================================

-- ── BLOQUE 1 · Auditoría en bookings (hueco D) ──────────────────────────────
-- refund_ref ya existe (cancel_bookings.sql). Sumamos quién/cuándo.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid;   -- users.id del admin que lo cerró


-- ── BLOQUE 2 · Estado de reembolso en payments (hueco B, huérfanos) ─────────
-- Un pago huérfano no tiene fila en bookings, así que su reembolso vive acá.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_ref    text,
  ADD COLUMN IF NOT EXISTS refunded_at   timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by   uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_refund_status_check') THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_refund_status_check
      CHECK (refund_status IN ('none', 'pending', 'refunded'));
  END IF;
END $$;


-- ── BLOQUE 3 · admin_cancel_booking (hueco A) ───────────────────────────────
-- El admin cancela un booking activo SIN la ventana de 15 días del cliente
-- (disputas, cancelaciones dentro de plazo). Deja el dinero retenido → el
-- booking queda 'refund_pending' y aparece en la lista de reembolsos.
-- No se puede cancelar si el pago ya fue girado al chef (payout released).
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


-- ── BLOQUE 4 · mark_refund_processed AMPLIADA (huecos C-audit, D) ───────────
-- Cambios vs. la versión de cancel_bookings.sql:
--   · p_admin_id nuevo → registra refunded_by + refunded_at.
--   · referencia del giro OBLIGATORIA (antifraude operativo: no marcar
--     "reembolsado" sin dejar constancia del giro real).
-- Firma nueva (uuid, text, uuid). La firma vieja (uuid, text) queda hasta que
-- se despliegue la server action nueva; se puede DROPear después.
CREATE OR REPLACE FUNCTION public.mark_refund_processed(
  p_booking_id uuid,
  p_refund_ref text,
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
  IF p_refund_ref IS NULL OR btrim(p_refund_ref) = '' THEN
    RAISE EXCEPTION 'refund_ref_required';
  END IF;

  SELECT booking_status, payment_status, payout_status INTO v
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  -- Idempotencia.
  IF v.payment_status = 'refunded' THEN
    RETURN;
  END IF;

  -- Solo se reembolsa un booking cancelado, con plata retenida y NO girada al chef.
  IF v.booking_status <> 'cancelled' OR v.payment_status <> 'paid' OR v.payout_status = 'released' THEN
    RAISE EXCEPTION 'refund not applicable (status=%, payment=%, payout=%)',
      v.booking_status, v.payment_status, v.payout_status;
  END IF;

  UPDATE public.bookings
  SET payment_status = 'refunded',
      refund_ref     = p_refund_ref,
      refunded_at    = now(),
      refunded_by    = p_admin_id,
      updated_at     = now()
  WHERE id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_refund_processed(uuid, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_refund_processed(uuid, text, uuid) TO service_role;


-- ── BLOQUE 5 · mark_orphan_payment_refunded (hueco B) ───────────────────────
-- Cierra el reembolso de un pago 'completed' que nunca llegó a booking. Guard:
-- que NO exista un booking para ese pago (si existe, se usa mark_refund_processed).
CREATE OR REPLACE FUNCTION public.mark_orphan_payment_refunded(
  p_payment_id uuid,
  p_refund_ref text,
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
  IF p_refund_ref IS NULL OR btrim(p_refund_ref) = '' THEN
    RAISE EXCEPTION 'refund_ref_required';
  END IF;

  SELECT id, status, dlocalgo_payment_id, refund_status INTO v
  FROM public.payments
  WHERE id = p_payment_id;

  IF v IS NULL THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v.refund_status = 'refunded' THEN
    RETURN;  -- idempotencia
  END IF;

  -- Solo pagos efectivamente cobrados.
  IF v.status <> 'completed' THEN
    RAISE EXCEPTION 'payment not completed (status=%)', v.status;
  END IF;

  -- Debe ser realmente huérfano: sin booking asociado.
  IF EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.payment_ref = v.dlocalgo_payment_id
  ) THEN
    RAISE EXCEPTION 'payment has booking; use mark_refund_processed';
  END IF;

  UPDATE public.payments
  SET refund_status = 'refunded',
      refund_ref    = p_refund_ref,
      refunded_at   = now(),
      refunded_by   = p_admin_id
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_orphan_payment_refunded(uuid, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.mark_orphan_payment_refunded(uuid, text, uuid) TO service_role;


-- ── BLOQUE 6 · get_pending_refunds_admin (lista unificada) ──────────────────
-- Reembolsos pendientes = bookings cancelados con plata retenida (refund_pending)
-- + pagos huérfanos completados aún no reembolsados. Reemplaza la query suelta de
-- page.tsx (que solo veía bookings). `kind` distingue qué RPC usar al procesar.
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
  created_at          timestamptz  -- fecha del pago (para ordenar huérfanos)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Bookings cancelados con plata todavía retenida.
  SELECT
    'booking'::text,
    b.id,
    b.request_id,
    b.payment_ref,
    COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente'),
    ci.email,
    b.total_amount,
    b.currency,
    b.cancelled_at,
    b.cancel_reason,
    b.confirmed_at
  FROM public.bookings b
  LEFT JOIN public.request_contact_info ci ON ci.request_id = b.request_id
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
    p.created_at
  FROM public.payments p
  LEFT JOIN public.request_contact_info ci ON ci.request_id = p.request_id
  WHERE p.status = 'completed'
    AND p.refund_status <> 'refunded'
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.payment_ref = p.dlocalgo_payment_id
    )

  ORDER BY 11 ASC;   -- 11ª col de salida (created_at): confirmed_at | payment.created_at
$$;

REVOKE ALL ON FUNCTION public.get_pending_refunds_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_refunds_admin() TO service_role;


-- ── VERIFICACIÓN (opcional) ─────────────────────────────────────────────────
-- SELECT * FROM public.get_pending_refunds_admin();
-- Después de desplegar la server action nueva, se puede limpiar la firma vieja:
--   DROP FUNCTION IF EXISTS public.mark_refund_processed(uuid, text);
