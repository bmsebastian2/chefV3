-- ============================================================================
-- Fase 2 · Pieza 2 — create_booking_for_payment()
--
-- Tapa el hueco que dejaba `bookings` vacía: crea el booking cuando un pago
-- queda PAID. Se llama desde applyDlocalgoPaymentStatus (lib/dlocalgo-verify.ts),
-- que corre por DOS caminos (webhook async + retorno ?payment=success sync), así
-- que la función es IDEMPOTENTE: un solo booking por propuesta.
--
-- SECURITY DEFINER + GRANT a service_role: se invoca con el admin client.
-- Toma el monto AUTORITATIVO desde `payments.amount` (calculado server-side en
-- create-payment), nunca de un input del cliente.
-- ============================================================================

-- ── Idempotencia: un booking por propuesta ──────────────────────────────────
-- (bookings está vacía hoy, así que el UNIQUE no choca con datos existentes.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_proposal_id_key'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_proposal_id_key UNIQUE (proposal_id);
  END IF;
END $$;

-- ── RPC ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_booking_for_payment(
  p_dlocalgo_payment_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment    record;
  v_proposal   record;
  v_total      numeric;
  v_rate       numeric := 0.15;   -- comisión global (snapshot por booking)
  v_commission numeric;
  v_booking_id uuid;
BEGIN
  -- 1. Pago (fuente del monto autoritativo)
  SELECT * INTO v_payment
  FROM public.payments
  WHERE dlocalgo_payment_id = p_dlocalgo_payment_id;

  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'payment not found: %', p_dlocalgo_payment_id;
  END IF;

  -- Solo se crea booking para pagos efectivamente completados.
  IF v_payment.status <> 'completed' THEN
    RETURN NULL;
  END IF;

  -- 2. Idempotencia: si ya existe booking para esta propuesta, devolverlo.
  SELECT id INTO v_booking_id
  FROM public.bookings
  WHERE proposal_id = v_payment.proposal_id;

  IF v_booking_id IS NOT NULL THEN
    RETURN v_booking_id;
  END IF;

  -- 2b. UN booking activo por request: si OTRA propuesta del mismo request ya
  --     tiene un booking no-cancelado, NO se crea un segundo (doble-reserva).
  --     Se devuelve NULL (no excepción) para que el webhook no reintente en loop:
  --     el pago queda 'completed' sin booking (huérfano) → lo reembolsa el admin.
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE request_id   = v_payment.request_id
      AND proposal_id  <> v_payment.proposal_id
      AND booking_status <> 'cancelled'
  ) THEN
    RAISE WARNING 'create_booking_for_payment: request % ya tiene booking activo de otra propuesta; pago % queda huérfano',
      v_payment.request_id, p_dlocalgo_payment_id;
    RETURN NULL;
  END IF;

  -- 3. Propuesta (de acá sale el chef)
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = v_payment.proposal_id;

  IF v_proposal IS NULL THEN
    RAISE EXCEPTION 'proposal not found for payment %', p_dlocalgo_payment_id;
  END IF;

  -- 4. Montos (snapshot de comisión)
  v_total      := v_payment.amount;
  v_commission := round(v_total * v_rate, 2);

  -- 5. Crear el booking → escrow: payment_status='paid' + payout_status='pending'
  --    Dentro de un bloque con EXCEPTION para atrapar la carrera contra el índice
  --    bookings_one_active_per_request (otra propuesta del request reservó entre
  --    el chequeo 2b y este insert).
  BEGIN
    INSERT INTO public.bookings (
      proposal_id, request_id, chef_id,
      total_amount, currency,
      commission_rate, commission_amount, chef_payout_amount,
      payment_status, booking_status, payout_status,
      payment_ref, confirmed_at
    ) VALUES (
      v_payment.proposal_id, v_payment.request_id, v_proposal.chef_id,
      v_total, COALESCE(v_payment.currency, 'USD'),
      v_rate, v_commission, v_total - v_commission,
      'paid', 'confirmed', 'pending',
      p_dlocalgo_payment_id, now()
    )
    ON CONFLICT (proposal_id) DO NOTHING
    RETURNING id INTO v_booking_id;
  EXCEPTION WHEN unique_violation THEN
    -- Carrera ganada por otra propuesta del request → no creamos doble booking.
    RAISE WARNING 'create_booking_for_payment: carrera, request % ya tiene reserva activa; pago % queda huérfano',
      v_payment.request_id, p_dlocalgo_payment_id;
    RETURN NULL;
  END;

  -- Carrera entre el check (paso 2) y el insert, MISMA propuesta: si el otro
  -- camino la insertó en el medio, ON CONFLICT no devuelve fila → la recuperamos.
  IF v_booking_id IS NULL THEN
    SELECT id INTO v_booking_id
    FROM public.bookings
    WHERE proposal_id = v_payment.proposal_id;
  END IF;

  -- 6. Sacar la solicitud del pool expirable: pasa a 'booked'. Así el job
  --    expire_stale_requests (que solo toca new/active/pending) no la cancela.
  UPDATE public.service_requests
  SET status = 'booked'
  WHERE id = v_payment.request_id
    AND status IN ('new', 'active', 'pending');

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_for_payment(text) TO service_role;
