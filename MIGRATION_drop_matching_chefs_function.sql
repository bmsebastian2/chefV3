-- ============================================================================
-- MIGRACIÓN · Eliminar get_matching_chefs_for_request (código muerto)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Esta función replicaba el matching chef↔request en SQL, PERO ningún código de
-- la app la llama: notifyMatchingChefs (notify-chefs.ts) hace su propio filtro en
-- JS (ahora con país + ciudades adicionales). Además su lógica quedó obsoleta
-- (lower/trim sin normalizar tildes, sin país, sin additional_cities), así que
-- mantenerla solo invita a divergencias. Se elimina.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_matching_chefs_for_request(uuid);
