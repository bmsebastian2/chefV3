-- ============================================================================
-- MIGRACIÓN · create_service_request acepta y persiste el país
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: MIGRATION_chef_additional_cities.sql (columna service_requests.country)
--
-- Único cambio vs. la versión previa: nuevo parámetro p_country (al final, con
-- DEFAULT para no romper llamadas viejas) que se inserta en service_requests.country.
-- COALESCE(p_country, 'Nicaragua') mantiene el fallback transitorio del único
-- mercado activo; quitar el COALESCE cuando el wizard siempre envíe país real.
--
-- Nota Postgres: agregar un parámetro cambia la firma → CREATE OR REPLACE crearía
-- una SOBRECARGA en vez de reemplazar. Por eso se dropea primero la firma vieja
-- (25 args) para quedarnos con una sola función (26 args).
-- ============================================================================

DROP FUNCTION IF EXISTS create_service_request(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, DATE,
  INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT,
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION create_service_request(
  p_user_id            UUID,
  p_service_type       TEXT,
  p_occasion           TEXT,
  p_location           TEXT,
  p_city               TEXT,
  p_event_date_start   DATE,
  p_contact_name       TEXT,
  p_contact_email      TEXT,
  p_event_time         TEXT    DEFAULT NULL,
  p_event_date_end     DATE    DEFAULT NULL,
  p_guests_adults      INTEGER DEFAULT 0,
  p_guests_teens       INTEGER DEFAULT 0,
  p_guests_kids        INTEGER DEFAULT 0,
  p_cuisine_type       TEXT    DEFAULT NULL,
  p_descripcion_evento TEXT    DEFAULT NULL,
  p_contact_phone      TEXT    DEFAULT NULL,
  p_vegetariano        BOOLEAN DEFAULT FALSE,
  p_vegano             BOOLEAN DEFAULT FALSE,
  p_sin_gluten         BOOLEAN DEFAULT FALSE,
  p_sin_lactosa        BOOLEAN DEFAULT FALSE,
  p_sin_mariscos       BOOLEAN DEFAULT FALSE,
  p_sin_frutos_secos   BOOLEAN DEFAULT FALSE,
  p_alergias_adicionales TEXT  DEFAULT NULL,
  p_notas_adicionales  TEXT    DEFAULT NULL,
  p_country            TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO public.service_requests (
    user_id, service_type, occasion,
    location, city, country,
    event_date_start, event_date_end, event_time,
    guests_adults, guests_teens, guests_kids,
    cuisine_type, descripcion_evento, status
  ) VALUES (
    p_user_id, p_service_type, p_occasion,
    p_location, p_city, COALESCE(p_country, 'Nicaragua'),
    p_event_date_start, p_event_date_end, p_event_time,
    p_guests_adults, p_guests_teens, p_guests_kids,
    p_cuisine_type, p_descripcion_evento, 'new'
  )
  RETURNING id INTO v_request_id;

  INSERT INTO public.request_contact_info (request_id, full_name, email, phone)
  VALUES (v_request_id, p_contact_name, p_contact_email, p_contact_phone);

  INSERT INTO public.request_restrictions (
    request_id, vegetariano, vegano, sin_gluten, sin_lactosa,
    sin_mariscos, sin_frutos_secos, alergias_adicionales, notas_adicionales
  ) VALUES (
    v_request_id, p_vegetariano, p_vegano, p_sin_gluten, p_sin_lactosa,
    p_sin_mariscos, p_sin_frutos_secos, p_alergias_adicionales, p_notas_adicionales
  );

  RETURN v_request_id;
END;
$$;
