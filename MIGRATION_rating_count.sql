-- ============================================================================
-- Rating real desde reviews · Paso 1 — rating_count en chef_profiles
--
--   · Agrega chef_profiles.rating_count = cantidad real de reviews del chef.
--   · Extiende recompute_chef_stats() para mantenerlo (junto a rating_avg y
--     total_services). El trigger trg_reviews_recompute ya existente lo dispara
--     en cada INSERT/UPDATE/DELETE de reviews → count siempre consistente.
--   · Backfill: recalcula TODOS los chefs una vez. Esto además NORMALIZA el
--     rating_avg de seed: los chefs sin reviews quedan en NULL (avg de conjunto
--     vacío), lo que ya subsume la limpieza del seed 4.6-con-0-reviews.
--
-- Requiere que create_reviews_table.sql y submit_review.sql ya estén aplicados.
-- ============================================================================

-- ── 1. Columna (gate único: count = reseñas reales, NO total_services) ───────
ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

-- ── 2. Patch a recompute_chef_stats: suma rating_count ──────────────────────
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
    rating_count = (
      SELECT count(*)
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

-- ── 3. Backfill: recalcula todos los chefs (setea rating_count y normaliza
--       rating_avg de seed a NULL donde no hay reviews) ─────────────────────
SELECT public.recompute_chef_stats(cp.id) FROM public.chef_profiles cp;
