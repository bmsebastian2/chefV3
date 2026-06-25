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
