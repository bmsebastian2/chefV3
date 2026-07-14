-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIONES PARA NicaraguaChefMap
-- Dos RPC SECURITY DEFINER para alimentar el mapa interactivo sin chocar con RLS.
-- No modifican el esquema: solo leen datos existentes.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) get_active_chefs_for_map()
--    Chefs activos de Nicaragua, con los campos PÚBLICOS necesarios para los
--    marcadores y la mini-card. Pensada para la home (visitantes anónimos).
--    La ubicación en el mapa se resuelve en el cliente cruzando `city` contra
--    el catálogo estático nicaragua-cities.json (no se hace geocoding aquí).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_active_chefs_for_map()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',            cp.id,
        'first_name',    u.first_name,
        'first_surname', u.first_surname,
        'photo_url',     COALESCE(
                           (SELECT ph.url
                              FROM chef_photos ph
                             WHERE ph.chef_id = cp.id
                               AND ph.type = 'profile'
                             ORDER BY ph.created_at DESC
                             LIMIT 1),
                           u.avatar_url
                         ),
        'city',          cp.city,
        'rating_avg',    cp.rating_avg,
        'rating_count',  cp.rating_count,
        'tagline',       cp.tagline
      )
    ),
    '[]'::JSONB
  )
  INTO result
  FROM chef_profiles cp
  JOIN users u ON u.id = cp.user_id
  WHERE cp.is_active = TRUE
    AND cp.city IS NOT NULL
    -- Solo Nicaragua: evita falsos positivos (León/Granada también existen en España).
    AND lower(cp.country) = 'nicaragua';

  RETURN result;
END;
$$;

REVOKE ALL    ON FUNCTION get_active_chefs_for_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_active_chefs_for_map() TO anon;
GRANT EXECUTE ON FUNCTION get_active_chefs_for_map() TO authenticated;
-- La home usa el admin client (service-role) para poder renderizarse estática/ISR.
-- Sin este GRANT el RPC devuelve "permission denied" y el mapa queda sin chefs.
GRANT EXECUTE ON FUNCTION get_active_chefs_for_map() TO service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) get_demand_by_city()
--    Conteo de solicitudes vigentes ('new' | 'active') agrupado por ciudad, para
--    el mapa de calor de demanda del dashboard del chef (prop mode="demand").
--    Es un agregado nacional sin PII; el cliente lo agrupa por departamento.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_demand_by_city()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'city',   t.city,
        'demand', t.demand
      )
    ),
    '[]'::JSONB
  )
  INTO result
  FROM (
    SELECT sr.city AS city, COUNT(*) AS demand
    FROM service_requests sr
    WHERE sr.status IN ('new', 'active')
      AND sr.city IS NOT NULL
    GROUP BY sr.city
  ) t;

  RETURN result;
END;
$$;

REVOKE ALL    ON FUNCTION get_demand_by_city() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_demand_by_city() TO authenticated;
