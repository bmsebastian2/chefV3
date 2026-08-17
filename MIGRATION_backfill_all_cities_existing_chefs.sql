-- ============================================================================
-- MIGRACIÓN · Backfill: todas las ciudades de Nicaragua como cobertura
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: MIGRATION_chef_additional_cities.sql (columna additional_cities +
--           normalize_city)
--
-- Contexto: hasta ahora additional_cities arrancaba vacía ('{}') para todo
-- chef, y solo se llenaba si el chef entraba a Preferencias de Solicitudes y
-- marcaba ciudades a mano. Cambio de producto: por default el chef debe cubrir
-- todo el país (recibe más solicitudes) y desmarcar si no le interesa.
--
-- El código (AdditionalCitiesPicker + request-settings/page.tsx) ya aplica
-- este default a nivel UI para quien nunca guardó esa sección. Este script es
-- el backfill explícito para chefs YA EXISTENTES: decisión del producto fue
-- aplicarlo a TODOS, sin excepción — incluye a quienes ya habían elegido
-- conscientemente un subconjunto (ver aviso más abajo).
--
-- ⚠️ Esto sobrescribe selecciones previas. Un chef que había dejado marcadas
-- solo 6 ciudades a propósito va a pasar a cubrir las 54 y por lo tanto a
-- recibir más emails de notificación de solicitudes fuera de esas 6. Es
-- intencional según lo pedido — no es un bug si un chef se queja después.
--
-- La lista de 54 claves es una copia puntual (snapshot) de las keys de
-- public/maps/data/nicaragua-cities.json al momento de escribir este script.
-- Es un backfill de una sola vez, no una fuente de verdad recurrente — si el
-- catálogo cambia después, esto NO se re-corre solo.
-- ============================================================================

UPDATE public.chef_profiles
SET
  additional_cities = array_remove(
    ARRAY[
      'managua','ciudad sandino','tipitapa','ticuantepe','el crucero','mateare',
      'pochomil','leon','nagarote','la paz centro','telica','poneloya','granada',
      'nandaime','masaya','nindiri','masatepe','catarina','san juan de oriente',
      'niquinohomo','la concepcion','esteli','condega','matagalpa','sebaco',
      'ciudad dario','chinandega','chichigalpa','corinto','el viejo','jinotega',
      'rivas','san juan del sur','tola','popoyo','san jorge','moyogalpa',
      'altagracia','jinotepe','diriamba','san marcos','boaco','camoapa',
      'juigalpa','santo tomas','somoto','ocotal','san carlos','bluefields',
      'corn island','nueva guinea','el rama','puerto cabezas','siuna'
    ],
    normalize_city(city)   -- no duplicar la ciudad base dentro de additional_cities
  ),
  updated_at = now()
WHERE normalize_city(country) IN ('nicaragua', 'ni');

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación rápida (opcional):
--   SELECT id, city, country, array_length(additional_cities, 1) AS n_cities
--   FROM public.chef_profiles
--   WHERE normalize_city(country) IN ('nicaragua', 'ni')
--   ORDER BY n_cities ASC NULLS FIRST
--   LIMIT 20;
--   -- esperado: n_cities = 53 (54 - la propia) para chefs con ciudad reconocida
--   -- en el catálogo, o 54 si su `city` no matchea ninguna clave del catálogo.
-- ─────────────────────────────────────────────────────────────────────────────
