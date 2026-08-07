-- ============================================================================
-- Comisión de plataforma — centralizada en DB, editable por el admin
--
-- Hasta ahora la tasa vivía hardcodeada (v_rate := 0.15) DENTRO de
-- create_booking_for_payment() (ver MIGRATION_booking_guests.sql, definición
-- vigente). Esta migración:
--
--   1. Crea platform_config (fila única) con la tasa vigente.
--   2. Redefine create_booking_for_payment() para que LEA la tasa de esa
--      tabla en vez de tenerla hardcodeada. Sin cambios de comportamiento
--      hoy: se siembra en 0.15, igual al valor que reemplaza.
--   3. Agrega update_commission_rate(), admin-only, para cambiarla a futuro
--      sin deploy. El guard de rol + PIN vive en el server action (TS); acá
--      solo se valida rango y se deja auditoría (updated_by/updated_at).
--
-- Bookings existentes NO se tocan: commission_rate/commission_amount/
-- chef_payout_amount siguen siendo un snapshot congelado por booking (columnas
-- ya existentes en bookings, ver bookings_lifecycle_columns.sql). Este cambio
-- solo afecta bookings NUEVOS a partir de acá.
-- ============================================================================

-- ── 1 · Tabla de config (fila única) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_config (
  id                int PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- fuerza fila única
  commission_rate   numeric NOT NULL DEFAULT 0.15,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES public.users(id)
);

INSERT INTO public.platform_config (id, commission_rate)
VALUES (1, 0.15)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Lectura abierta: la tasa no es dato sensible (ya se referencia en los
-- Términos y Condiciones) y la necesitan páginas de chef/admin vía el cliente
-- normal, sin pasar por service_role. Sin policies de escritura: solo
-- service_role (bypassa RLS) puede modificarla, y únicamente a través de
-- update_commission_rate().
DROP POLICY IF EXISTS platform_config_select_all ON public.platform_config;
CREATE POLICY platform_config_select_all
  ON public.platform_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── 2 · create_booking_for_payment() — lee la tasa en vez de hardcodearla ───
-- Idéntica a la definición vigente (MIGRATION_booking_guests.sql, 2026-07-24,
-- incluye el snapshot de guests) salvo el origen de v_rate.
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
  v_rate       numeric;
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

  -- 4. Montos (snapshot de comisión) — tasa VIGENTE al momento del booking,
  --    leída de platform_config. Cambiarla después no toca bookings ya creados.
  SELECT commission_rate INTO v_rate FROM public.platform_config WHERE id = 1;

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
      payment_ref, confirmed_at,
      guests
    ) VALUES (
      v_payment.proposal_id, v_payment.request_id, v_proposal.chef_id,
      v_total, COALESCE(v_payment.currency, 'USD'),
      v_rate, v_commission, v_total - v_commission,
      'paid', 'confirmed', 'pending',
      p_dlocalgo_payment_id, now(),
      v_payment.guests
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

  -- 6b. Sincronizar los comensales del request con los reservados, para que el
  --      chef vea en todo su dashboard el número que se cobró. El total absorbe
  --      en guests_adults y teens/kids van a 0: la reserva no captura desglose
  --      por edades, y cuantas_personas (columna calculada) se recalcula sola.
  --      Solo si difiere del total actual y el pago trae guests (pagos
  --      históricos / reconciliados no lo tienen).
  IF v_payment.guests IS NOT NULL AND v_payment.guests > 0 THEN
    UPDATE public.service_requests
    SET guests_adults = v_payment.guests,
        guests_teens  = 0,
        guests_kids   = 0
    WHERE id = v_payment.request_id
      AND COALESCE(guests_adults, 0) + COALESCE(guests_teens, 0) + COALESCE(guests_kids, 0)
          <> v_payment.guests;
  END IF;

  RETURN v_booking_id;
END;
$$;

-- Hueco preexistente cerrado de paso: esta función nunca tuvo REVOKE ALL FROM
-- PUBLIC (a diferencia de release_payout/get_releasable_bookings, que sí lo
-- tienen), así que quedaba ejecutable por anon/authenticated además de
-- service_role. Sin relación con la comisión — se cierra acá por estar ya
-- redefiniendo esta función.
REVOKE ALL ON FUNCTION public.create_booking_for_payment(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_booking_for_payment(text) TO service_role;

-- ── 3 · update_commission_rate() — el admin cambia la tasa, sin deploy ──────
-- p_new_rate es la tasa como DECIMAL (0.14 = 14%), no porcentaje entero: la
-- conversión "14 → 0.14" se hace en el server action, así el RPC nunca recibe
-- un valor ambiguo. Guard de rol admin + PIN vive en el server action (TS) —
-- acá solo se valida rango y se persiste con auditoría de quién/cuándo.
CREATE OR REPLACE FUNCTION public.update_commission_rate(
  p_new_rate numeric,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_new_rate IS NULL OR p_new_rate <= 0 OR p_new_rate >= 1 THEN
    RAISE EXCEPTION 'invalid_commission_rate';
  END IF;

  UPDATE public.platform_config
  SET commission_rate = p_new_rate,
      updated_at      = now(),
      updated_by      = p_admin_id
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.update_commission_rate(numeric, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_commission_rate(numeric, uuid) TO service_role;
