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
