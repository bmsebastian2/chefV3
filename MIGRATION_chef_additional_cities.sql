-- ============================================================================
-- MIGRACIÓN · Ciudades adicionales del chef + país de la solicitud
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Objetivo: un chef puede declarar ciudades ADICIONALES (dentro de su mismo país)
-- donde acepta recibir solicitudes, además de su ciudad base. El matching pasa a
-- ser: request.country == chef.country  Y  request.city ∈ (chef.city + adicionales).
--
-- Esta entrega es SOLO el modelo de datos + la función de normalización compartida.
-- El matching (dashboard, email, mapa) y el wizard se actualizan en entregas aparte.
--
-- Cambios:
--   1. normalize_city(text)            → fuente única de verdad para normalizar
--   2. chef_profiles.additional_cities → text[] de CLAVES NORMALIZADAS del catálogo
--   3. service_requests.country        → país de la solicitud (faltaba persistirlo)
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. normalize_city(text): réplica EXACTA y determinista de normalizeCity (TS).
--    Pasos: recorta dígitos en los bordes → minúsculas → quita diacríticos
--    (incl. ñ→n, ç→c) → colapsa espacios. Devuelve NULL si queda vacío.
--
--    IMMUTABLE a propósito (entrada→salida fija): se puede usar en WHERE de las
--    RPC de matching e incluso indexar a futuro. No usa la extensión `unaccent`
--    (que es solo STABLE) — usa translate() para mantenerse determinista y para
--    no depender de extensiones.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_city(p_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        translate(
          lower(
            btrim(
              regexp_replace(
                regexp_replace(COALESCE(p_city, ''), '^\d+\s+', ''),  -- "11800 Montevideo" → "Montevideo"
                '\s+\d+$', ''                                          -- "Managua 12"        → "Managua"
              )
            )
          ),
          'áàäâãéèëêíìïîóòöôõúùüûñç',   -- vocales acentuadas + ñ + ç
          'aaaaaeeeeiiiiooooouuuunc'
        ),
        '\s+', ' ', 'g'                  -- colapsa espacios internos
      )
    ),
    ''
  );
$$;

REVOKE ALL    ON FUNCTION public.normalize_city(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.normalize_city(text) TO authenticated, anon, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. chef_profiles.additional_cities
--    Array de CLAVES NORMALIZADAS del catálogo (ej. '{leon,granada}'). NUNCA texto
--    libre ni el `name` con tildes — el selector de la UI guarda la clave del JSON.
--    No requiere GRANT nuevo: chef_profiles ya tiene GRANT UPDATE a authenticated
--    a nivel tabla y RLS de "solo tu propia fila"; una columna nueva queda cubierta.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chef_profiles
  ADD COLUMN IF NOT EXISTS additional_cities text[] NOT NULL DEFAULT '{}';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. service_requests.country
--    Hasta ahora la solicitud NO guardaba país (solo city). El wizard YA lo captura
--    (data.location.countryCode/name) pero no se persistía. Sin país no se puede
--    enforcar "mismo país" sin hacks frágiles (las ciudades colisionan entre países:
--    León existe en Nicaragua y en España).
--
--    DEFAULT 'Nicaragua' es TRANSITORIO: refleja el único mercado activo hoy, así
--    las solicitudes nuevas matchean aunque el wizard todavía no envíe el país.
--    Cuando el wizard pase p_country explícito y haya multi-país, quitar el DEFAULT.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Nicaragua';

-- Backfill: todo lo existente es Nicaragua.
UPDATE public.service_requests
   SET country = 'Nicaragua'
 WHERE country IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- Verificación rápida (opcional):
--   SELECT normalize_city('11800 León');           -- → 'leon'
--   SELECT normalize_city('Puerto Cabezas');        -- → 'puerto cabezas'
--   SELECT additional_cities FROM chef_profiles LIMIT 1;
--   SELECT country FROM service_requests LIMIT 1;
-- ─────────────────────────────────────────────────────────────────────────────
