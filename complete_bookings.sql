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
  SELECT b.id, b.request_id, b.chef_id, b.booking_status, b.payment_status
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
