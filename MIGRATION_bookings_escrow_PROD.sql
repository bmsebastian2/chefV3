-- ============================================================================
-- MIGRACIÓN CONSOLIDADA — Bookings + Escrow + Panel Admin  (rama feature/bookings-escrow)
--
-- CÓMO USAR: pegar TODO este archivo en el SQL Editor de Supabase de PRODUCCIÓN
-- y ejecutar una sola vez. Todo es IDEMPOTENTE (se puede re-correr sin romper).
-- Ejecuta dentro de una transacción implícita del editor; si algo falla, revisar
-- el error y volver a correr. ORDEN ya resuelto por dependencias (no reordenar).
--
-- ⚠️ PRE-CHECK OBLIGATORIO: este bundle ASUME que la tabla public.bookings ya
-- existe (las 11 piezas la ALTERan). El bloque 0 la crea con IF NOT EXISTS como
-- red de seguridad; si prod ya la tiene, no hace nada. Verificá igual que las
-- columnas base (proposal_id, request_id, chef_id, total_amount, payment_status,
-- booking_status, payment_ref, confirmed_at) existan antes de seguir.
-- ============================================================================

-- ── BLOQUE 0 · Tabla base bookings (red de seguridad, idempotente) ──────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    uuid NOT NULL REFERENCES public.proposals(id)         ON DELETE RESTRICT,
  request_id     uuid NOT NULL REFERENCES public.service_requests(id)  ON DELETE RESTRICT,
  chef_id        uuid NOT NULL REFERENCES public.chef_profiles(id)     ON DELETE RESTRICT,
  total_amount   numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'paid',      -- paid / refunded
  booking_status text NOT NULL DEFAULT 'confirmed', -- confirmed / completed / cancelled
  payment_ref    text,
  confirmed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);



-- ##########################################################################
-- ## BLOQUE 1 · bookings_lifecycle_columns
-- ##########################################################################

-- ============================================================================
-- Fase 2 · Pieza 1 — Columnas de ciclo de vida + escrow/comisión/payout en
-- `bookings`, más RLS de SELECT para cliente y chef.
--
-- Opción A: `bookings` es la tabla central del servicio. El dinero del cliente
-- (payment_status), el dinero al chef (payout_status) y el ciclo de vida del
-- servicio (booking_status) son tres dimensiones separadas.
--
-- "Escrow" = payment_status='paid' AND payout_status='pending' (dinero retenido).
--
-- Idempotente: se puede correr más de una vez sin romper nada.
-- NO abre policies de INSERT/UPDATE: todas las escrituras pasan por los RPCs
-- SECURITY DEFINER de las piezas 2-6.
-- ============================================================================

-- ── Columnas nuevas ─────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency           text    NOT NULL DEFAULT 'USD',
  -- Snapshot de la tasa de comisión vigente al crearse el booking. Si la
  -- comisión global cambia después, este servicio conserva la que tenía.
  ADD COLUMN IF NOT EXISTS commission_rate    numeric NOT NULL DEFAULT 0.15,
  -- Comisión en dinero = total_amount * commission_rate (la fija el RPC).
  ADD COLUMN IF NOT EXISTS commission_amount  numeric,
  -- Neto al chef = total_amount - commission_amount (la fija el RPC).
  ADD COLUMN IF NOT EXISTS chef_payout_amount numeric,
  -- Dinero al chef: pending (retenido) → released (transferido) | failed.
  ADD COLUMN IF NOT EXISTS payout_status      text    NOT NULL DEFAULT 'pending',
  -- Referencia del giro manual al chef (lo carga el admin al transferir).
  ADD COLUMN IF NOT EXISTS payout_ref         text,
  ADD COLUMN IF NOT EXISTS completed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS released_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at       timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason      text;

-- ── CHECK de payout_status (idempotente vía DO block) ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payout_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payout_status_check
      CHECK (payout_status IN ('pending', 'released', 'failed'));
  END IF;
END $$;

-- ── RLS: lectura para cliente y chef ────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- El cliente ve los bookings de sus propias solicitudes.
DROP POLICY IF EXISTS "Clients can view their bookings" ON public.bookings;
CREATE POLICY "Clients can view their bookings" ON public.bookings
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.service_requests WHERE user_id = auth.uid()
    )
  );

-- El chef ve los bookings asociados a su perfil.
DROP POLICY IF EXISTS "Chefs can view their bookings" ON public.bookings;
CREATE POLICY "Chefs can view their bookings" ON public.bookings
  FOR SELECT USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
    )
  );


-- ##########################################################################
-- ## BLOQUE 2 · add_booked_status
-- ##########################################################################

-- ============================================================================
-- Fase 2 · Pieza 3b — Status 'booked' en service_requests
--
-- Al pagarse una solicitud pasa a 'booked'. Esto la saca del conjunto que el job
-- expire_stale_requests cancela (solo toca 'new'/'active'/'pending'), evitando
-- que una solicitud YA PAGADA se auto-cancele al pasar la fecha del evento.
--
-- Mismo patrón que activate_requests_migration.sql (la tabla usa un CHECK con
-- nombre service_requests_status_check; el error 23514 lo confirma).
-- ============================================================================

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_status_check
  CHECK (status IN (
    'new',
    'active',
    'pending_confirmation',
    'completed',
    'cancelled',
    'pending',
    'booked'          -- NUEVO: solicitud pagada, con booking activo
  ));


-- ##########################################################################
-- ## BLOQUE 3 · one_active_booking_per_request
-- ##########################################################################

-- ============================================================================
-- Integridad: UN SOLO booking activo por service_request.
--
-- Red de seguridad contra el doble-pago: aunque fallen los chequeos de backend
-- (create-payment) y de la confirmación (create_booking_for_payment), esto hace
-- IMPOSIBLE que existan dos bookings no-cancelados para el mismo request, incluso
-- bajo condición de carrera (dos pagos casi simultáneos de propuestas distintas).
--
-- Activo = booking_status <> 'cancelled' (confirmed o completed). Un booking
-- cancelado libera el request → se puede reservar otra propuesta.
--
-- Convive con el UNIQUE(proposal_id) existente (1 booking por propuesta).
-- Requiere: cero duplicados activos preexistentes (confirmado: la tabla no los tiene).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_request
  ON public.bookings (request_id)
  WHERE booking_status <> 'cancelled';


-- ##########################################################################
-- ## BLOQUE 4 · create_booking_for_payment
-- ##########################################################################

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


-- ##########################################################################
-- ## BLOQUE 5 · cancel_bookings
-- ##########################################################################

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


-- ##########################################################################
-- ## BLOQUE 6 · create_reviews_table
-- ##########################################################################

-- ============================================================================
-- Fase 2 · Tabla `reviews` (FALTABA) — la usa submit_review.sql pero ningún SQL
-- la creaba. Sin esta tabla, submit_review falla → "No se pudo enviar la reseña".
--
-- Aplicar ESTE archivo ANTES de (re)aplicar submit_review.sql.
-- Columnas según el INSERT de submit_review(): booking_id, chef_id,
-- reviewer_name, los 4 sub-ratings (1-5) y comment.
-- Una reseña por booking → booking_id UNIQUE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           uuid NOT NULL UNIQUE
                         REFERENCES public.bookings(id) ON DELETE CASCADE,
  chef_id              uuid NOT NULL
                         REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  reviewer_name        text,
  rating_chef          integer NOT NULL CHECK (rating_chef         BETWEEN 1 AND 5),
  rating_food          integer NOT NULL CHECK (rating_food         BETWEEN 1 AND 5),
  rating_presentation  integer NOT NULL CHECK (rating_presentation BETWEEN 1 AND 5),
  rating_cleanliness   integer NOT NULL CHECK (rating_cleanliness  BETWEEN 1 AND 5),
  comment              text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Índice para leer reseñas por chef (rating/listados).
CREATE INDEX IF NOT EXISTS reviews_chef_id_idx ON public.reviews (chef_id);

-- Lectura: la RLS y la policy de lectura pública las crea submit_review.sql.
-- La escritura es solo vía la función SECURITY DEFINER submit_review().


-- ##########################################################################
-- ## BLOQUE 7 · submit_review
-- ##########################################################################

-- ============================================================================
-- Fase 2 · Pieza 6 — Reseñas + recálculo de rating
--
--   recompute_chef_stats(chef_id)   → recalcula rating_avg y total_services
--   trigger on reviews              → dispara el recálculo al reseñar/editar/borrar
--   submit_review(...)              → el CLIENTE reseña (solo si booking completed)
--
-- Decisiones aplicadas:
--   · rating_avg     = promedio de los 4 sub-ratings sobre TODAS las reseñas del chef
--   · total_services = cantidad de bookings COMPLETADOS del chef (no de reseñas:
--                      no todos reseñan). Por eso recompute_chef_stats se llama
--                      también desde complete_booking / auto_complete_bookings.
--   · una reseña por booking (reviews.booking_id es UNIQUE)
-- ============================================================================

-- ── 1. Recálculo de stats del chef (fuente de verdad) ───────────────────────
CREATE OR REPLACE FUNCTION public.recompute_chef_stats(
  p_chef_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chef_profiles cp
  SET
    rating_avg = (
      SELECT round(
        avg((r.rating_chef + r.rating_food + r.rating_presentation + r.rating_cleanliness) / 4.0),
        2
      )
      FROM public.reviews r
      WHERE r.chef_id = p_chef_id
    ),
    total_services = (
      SELECT count(*)
      FROM public.bookings b
      WHERE b.chef_id = p_chef_id
        AND b.booking_status = 'completed'
    ),
    updated_at = now()
  WHERE cp.id = p_chef_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_chef_stats(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.recompute_chef_stats(uuid) TO service_role;

-- ── 2. Trigger sobre reviews → recalcula rating del chef afectado ───────────
CREATE OR REPLACE FUNCTION public.reviews_recompute_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_chef_stats(OLD.chef_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_chef_stats(NEW.chef_id);
    -- Si en un UPDATE cambiara el chef_id (no debería), recalcular el viejo también.
    IF TG_OP = 'UPDATE' AND OLD.chef_id IS DISTINCT FROM NEW.chef_id THEN
      PERFORM public.recompute_chef_stats(OLD.chef_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_recompute ON public.reviews;
CREATE TRIGGER trg_reviews_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_recompute_trigger();

-- ── 3. RLS de reviews: lectura pública, escritura solo vía RPC ──────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
CREATE POLICY "Reviews are publicly readable" ON public.reviews
  FOR SELECT USING (true);

-- ── 4. Dejar reseña (cliente) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_review(
  p_booking_id           uuid,
  p_rating_chef          integer,
  p_rating_food          integer,
  p_rating_presentation  integer,
  p_rating_cleanliness   integer,
  p_comment              text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking      record;
  v_reviewer     text;
  v_review_id    uuid;
BEGIN
  -- Booking + verificación de propiedad del cliente.
  SELECT b.id, b.chef_id, b.booking_status
    INTO v_booking
  FROM public.bookings b
  JOIN public.service_requests sr ON sr.id = b.request_id
  WHERE b.id = p_booking_id
    AND sr.user_id = auth.uid();

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'booking not found or not authorized';
  END IF;

  -- Solo se reseña un servicio completado.
  IF v_booking.booking_status <> 'completed' THEN
    RAISE EXCEPTION 'booking not completed';
  END IF;

  -- Una reseña por booking.
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'already_reviewed';
  END IF;

  -- Validar rangos (además del CHECK de la tabla, para dar un error claro).
  IF p_rating_chef         NOT BETWEEN 1 AND 5
  OR p_rating_food         NOT BETWEEN 1 AND 5
  OR p_rating_presentation NOT BETWEEN 1 AND 5
  OR p_rating_cleanliness  NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'rating out of range (1-5)';
  END IF;

  -- Nombre del reseñador desde el perfil del usuario.
  SELECT NULLIF(trim(concat_ws(' ', u.first_name, u.first_surname)), '')
    INTO v_reviewer
  FROM public.users u
  WHERE u.id = auth.uid();

  INSERT INTO public.reviews (
    booking_id, chef_id, reviewer_name,
    rating_chef, rating_food, rating_presentation, rating_cleanliness,
    comment
  ) VALUES (
    p_booking_id, v_booking.chef_id, COALESCE(v_reviewer, 'Cliente'),
    p_rating_chef, p_rating_food, p_rating_presentation, p_rating_cleanliness,
    NULLIF(trim(p_comment), '')
  )
  RETURNING id INTO v_review_id;
  -- (el trigger trg_reviews_recompute actualiza rating_avg del chef)

  RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(uuid, integer, integer, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_review(uuid, integer, integer, integer, integer, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.submit_review(uuid, integer, integer, integer, integer, text) TO service_role;


-- ##########################################################################
-- ## BLOQUE 8 · complete_bookings
-- ##########################################################################

-- ============================================================================
-- Fase 2 · Pieza 3 — Completar el servicio
--
--   complete_booking(p_booking_id)   → el CLIENTE confirma manualmente
--   auto_complete_bookings()         → fallback: a los 7 días del evento, si el
--                                       cliente nunca confirmó (job pg_cron)
--
-- Transición: booking_status 'confirmed' → 'completed' (+ completed_at).
-- Habilita la reseña (Pieza 6) y abre la ventana de liberación (Pieza 5).
-- ============================================================================

-- ── 1. Confirmación manual del cliente ──────────────────────────────────────
-- Se invoca con la sesión del usuario (auth.uid() = cliente). SECURITY DEFINER
-- para poder escribir, pero verifica adentro que el booking sea de una solicitud
-- suya. Idempotente: si ya está completed (ej. lo completó el job), no falla.
CREATE OR REPLACE FUNCTION public.complete_booking(
  p_booking_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  -- Booking + verificación de propiedad (el cliente dueño de la solicitud).
  -- service_date = fecha de referencia del servicio:
  --   single   → event_date_start (día único)
  --   multiple → event_date_end   (último día del evento)
  --   weekly   → event_date_start (fecha de inicio)
  SELECT b.id, b.request_id, b.chef_id, b.booking_status, b.payment_status,
         COALESCE(sr.event_date_end, sr.event_date_start) AS service_date
    INTO v_booking
  FROM public.bookings b
  JOIN public.service_requests sr ON sr.id = b.request_id
  WHERE b.id = p_booking_id
    AND sr.user_id = auth.uid();

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'booking not found or not authorized';
  END IF;

  -- Idempotencia: ya completado → no hacer nada.
  IF v_booking.booking_status = 'completed' THEN
    RETURN;
  END IF;

  -- No se puede completar un booking cancelado, ni uno sin pago confirmado.
  IF v_booking.booking_status <> 'confirmed' OR v_booking.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'booking not completable (status=%, payment=%)',
      v_booking.booking_status, v_booking.payment_status;
  END IF;

  -- La fecha del servicio debe haber llegado o pasado: un servicio futuro no pudo
  -- prestarse, así que no se puede marcar como completado (esto abre la liberación
  -- del pago al chef). Comparamos contra "hoy" en America/Managua (UTC-6), el huso
  -- más atrasado que servimos, para no habilitar la confirmación antes de que el día
  -- del evento haya llegado en ninguna región. NO usamos CURRENT_DATE (UTC), que
  -- adelantaría el día hasta 6h y podría habilitar la noche anterior al evento.
  IF v_booking.service_date IS NULL
     OR v_booking.service_date > (now() AT TIME ZONE 'America/Managua')::date THEN
    RAISE EXCEPTION 'service_date_not_reached (service_date=%)', v_booking.service_date;
  END IF;

  UPDATE public.bookings
  SET booking_status = 'completed',
      completed_at   = now(),
      updated_at     = now()
  WHERE id = p_booking_id;

  -- Mantener la solicitud en sincronía con el ciclo de vida del servicio.
  UPDATE public.service_requests
  SET status = 'completed'
  WHERE id = v_booking.request_id
    AND status = 'booked';

  -- Actualizar total_services del chef (cuenta de bookings completados).
  PERFORM public.recompute_chef_stats(v_booking.chef_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_booking(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.complete_booking(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_booking(uuid) TO service_role;

-- ── 2. Fallback automático (job a 7 días) ───────────────────────────────────
-- Si el cliente no confirma, el chef no podría cobrar nunca. A los 7 días de la
-- fecha del evento marcamos el servicio como completado igual.
CREATE OR REPLACE FUNCTION public.auto_complete_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    integer;
  v_chef_ids uuid[];
  v_chef     uuid;
BEGIN
  WITH updated AS (
    UPDATE public.bookings b
    SET booking_status = 'completed',
        completed_at   = now(),
        updated_at     = now()
    FROM public.service_requests sr
    WHERE b.request_id = sr.id
      AND b.booking_status = 'confirmed'
      AND b.payment_status = 'paid'
      -- 7 días después del fin del evento (o del inicio si no hay fecha de fin).
      AND COALESCE(sr.event_date_end, sr.event_date_start) < CURRENT_DATE - INTERVAL '7 days'
    RETURNING b.request_id, b.chef_id
  ),
  -- Sincronizar las solicitudes correspondientes a 'completed'.
  synced AS (
    UPDATE public.service_requests sr
    SET status = 'completed'
    FROM updated
    WHERE sr.id = updated.request_id
      AND sr.status = 'booked'
    RETURNING sr.id
  )
  SELECT count(*), array_agg(DISTINCT chef_id)
    INTO v_count, v_chef_ids
  FROM updated;

  -- Recalcular stats (total_services) de cada chef afectado.
  IF v_chef_ids IS NOT NULL THEN
    FOREACH v_chef IN ARRAY v_chef_ids LOOP
      PERFORM public.recompute_chef_stats(v_chef);
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_complete_bookings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.auto_complete_bookings() TO service_role;

-- ── 3. Programar el job (pg_cron) ───────────────────────────────────────────
-- Corre cada día a las 03:00 UTC = 00:00 Uruguay (UTC-3), igual que el job
-- de expiración de solicitudes.
SELECT cron.schedule(
  'auto-complete-bookings',
  '0 3 * * *',
  $cron$
    SELECT public.auto_complete_bookings();
  $cron$
);

-- ── VERIFICACIÓN (opcional) ─────────────────────────────────────────────────
-- Ver el job:        SELECT * FROM cron.job WHERE jobname = 'auto-complete-bookings';
-- Probar a mano:     SELECT public.auto_complete_bookings();
-- Cuántos afectaría:
--   SELECT count(*) FROM public.bookings b
--   JOIN public.service_requests sr ON sr.id = b.request_id
--   WHERE b.booking_status = 'confirmed' AND b.payment_status = 'paid'
--     AND COALESCE(sr.event_date_end, sr.event_date_start) < CURRENT_DATE - INTERVAL '7 days';


-- ##########################################################################
-- ## BLOQUE 9 · release_payout
-- ##########################################################################

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


-- ##########################################################################
-- ## BLOQUE 10 · get_all_payments_admin
-- ##########################################################################

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


-- ##########################################################################
-- ## BLOQUE 11 · get_released_bookings
-- ##########################################################################

-- ============================================================================
-- Panel admin · Pagos liberados — get_released_bookings()
--
-- Devuelve el HISTÓRICO de payouts ya girados al chef (payout_status='released')
-- con todo lo necesario para el panel: identidad (chef + cliente), descripción
-- del servicio, montos (bruto/comisión/neto), moneda, fecha de liberación y la
-- referencia del giro manual.
--
-- La agrupación por mes, el promedio neto y el ranking de chef se calculan en TS
-- sobre este payload — la RPC solo entrega filas planas ordenadas por released_at.
--
-- Admin-only: SECURITY DEFINER (bypassa RLS) + REVOKE PUBLIC + GRANT a
-- service_role. Se invoca con el admin client desde /admin (ruta ya gateada por
-- el layout que exige users.role='admin'). Nunca expuesta a authenticated.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_released_bookings()
RETURNS TABLE (
  booking_id         uuid,
  chef_id            uuid,
  chef_name          text,
  client_name        text,
  client_email       text,
  service_type       text,
  occasion           text,
  city               text,
  total_amount       numeric,
  commission_amount  numeric,
  chef_payout_amount numeric,
  currency           text,
  completed_at       timestamptz,
  released_at        timestamptz,
  payout_ref         text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.chef_id,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.first_surname)), ''),
      'Chef'
    )                                   AS chef_name,
    COALESCE(NULLIF(TRIM(ci.full_name), ''), 'Cliente') AS client_name,
    ci.email                            AS client_email,
    sr.service_type,
    sr.occasion,
    sr.city,
    b.total_amount,
    b.commission_amount,
    b.chef_payout_amount,
    b.currency,
    b.completed_at,
    b.released_at,
    b.payout_ref
  FROM public.bookings b
  LEFT JOIN public.chef_profiles cp      ON cp.id = b.chef_id
  LEFT JOIN public.users cu              ON cu.id = cp.user_id
  LEFT JOIN public.service_requests sr   ON sr.id = b.request_id
  LEFT JOIN public.request_contact_info ci ON ci.request_id = b.request_id
  WHERE b.payout_status = 'released'
    AND b.released_at IS NOT NULL
  ORDER BY b.released_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_released_bookings() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_released_bookings() TO service_role;
