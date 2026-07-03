-- ============================================================================
-- Panel admin · Monitoreo de solicitudes — get_requests_admin(...)
--
-- LECTURA PURA, paginada y filtrable, de service_requests para que el admin
-- monitoree la demanda entrante. No toca ninguna lógica existente.
--
-- Devuelve un único objeto JSONB con tres llaves:
--   • rows    : el LOTE paginado de solicitudes que matchean los filtros
--               (ya ordenado por created_at DESC). Cada fila trae el contacto
--               del cliente (join a request_contact_info) y el conteo de
--               propuestas recibidas (señal de demanda insatisfecha cuando es 0).
--   • total   : total de filas que matchean los filtros (para la paginación;
--               permite saber si quedan más lotes por traer).
--   • summary : agregados GLOBALES (ignoran los filtros) para las tarjetas de
--               resumen — dan el pulso general aunque el admin filtre la tabla:
--                 total_all          · todas las solicitudes
--                 active             · solicitudes vivas (status 'new')
--                 without_proposals  · vivas SIN ninguna propuesta todavía
--                 cities             · [{city, count}] desc — alimenta el
--                                      dropdown de ciudad y la "ciudad top"
--
-- Filtros (todos opcionales; NULL o 'todos' = sin filtrar):
--   p_status        · estado exacto: 'new' | 'pending_confirmation' |
--                     'cancelled' | 'completed' | 'active' | 'pending'
--   p_service_type  · 'single' | 'multiple' | 'weekly'
--   p_city          · ciudad cruda (match case-insensitive); el valor se toma
--                     tal cual viene en summary.cities[].city
--   p_date_from     · solo solicitudes con created_at >= esta fecha
--   p_limit/p_offset· paginación por lotes (LIMIT/OFFSET)
--
-- Admin-only: SECURITY DEFINER (bypassa RLS) + REVOKE PUBLIC + GRANT service_role.
-- Se invoca con el admin client desde una server action que ya valida
-- users.role='admin'. El layout de /admin también exige rol admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_requests_admin(
  p_status       text    DEFAULT 'new',
  p_service_type text    DEFAULT NULL,
  p_city         text    DEFAULT NULL,
  p_date_from    date    DEFAULT NULL,
  p_limit        integer DEFAULT 20,
  p_offset       integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows    jsonb;
  v_total   integer;
  v_summary jsonb;
  -- "Activas" no es un solo estado: agrupa todas las solicitudes vivas
  -- (sin confirmar / abiertas / pagadas en escrow). El filtro 'new' de la UI
  -- y los agregados del resumen usan este conjunto.
  v_active  text[] := ARRAY['new', 'active', 'pending', 'pending_confirmation', 'booked'];
BEGIN
  -- ── Lote paginado de filas que matchean los filtros ──
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      sr.id,
      sr.created_at,
      sr.status,
      sr.service_type,
      sr.occasion,
      sr.city,
      sr.location,
      sr.event_date_start,
      sr.event_date_end,
      sr.event_time,
      sr.guests_adults,
      sr.guests_teens,
      sr.guests_kids,
      sr.cuantas_personas,
      sr.cuisine_type,
      sr.budget_min,
      sr.budget_max,
      sr.cancel_reason,
      COALESCE(NULLIF(btrim(ci.full_name), ''), 'Cliente') AS client_name,
      ci.email                                             AS client_email,
      (SELECT count(*) FROM public.proposals p WHERE p.request_id = sr.id)::int AS proposals_count
    FROM public.service_requests sr
    LEFT JOIN public.request_contact_info ci ON ci.request_id = sr.id
    WHERE (p_status       IS NULL OR p_status = 'todos'
            OR (p_status =  'new' AND sr.status = ANY(v_active))
            OR (p_status <> 'new' AND sr.status = p_status))
      AND (p_service_type IS NULL OR p_service_type = 'todos' OR sr.service_type = p_service_type)
      AND (p_city         IS NULL OR p_city         = 'todos' OR lower(btrim(sr.city)) = lower(btrim(p_city)))
      AND (p_date_from    IS NULL OR sr.created_at >= p_date_from)
    ORDER BY sr.created_at DESC
    LIMIT  GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0)
  ) t;

  -- ── Total que matchea los filtros (para saber si quedan más lotes) ──
  SELECT count(*)
  INTO v_total
  FROM public.service_requests sr
  WHERE (p_status       IS NULL OR p_status = 'todos'
          OR (p_status =  'new' AND sr.status = ANY(v_active))
          OR (p_status <> 'new' AND sr.status = p_status))
    AND (p_service_type IS NULL OR p_service_type = 'todos' OR sr.service_type = p_service_type)
    AND (p_city         IS NULL OR p_city         = 'todos' OR lower(btrim(sr.city)) = lower(btrim(p_city)))
    AND (p_date_from    IS NULL OR sr.created_at >= p_date_from);

  -- ── Resumen global (independiente de los filtros) ──
  SELECT jsonb_build_object(
    'total_all', (SELECT count(*) FROM public.service_requests),
    'active',    (SELECT count(*) FROM public.service_requests WHERE status = ANY(v_active)),
    'without_proposals', (
      SELECT count(*)
      FROM public.service_requests sr2
      WHERE sr2.status = ANY(v_active)
        AND NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.request_id = sr2.id)
    ),
    'cities', (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('city', city, 'count', cnt) ORDER BY cnt DESC, city ASC),
        '[]'::jsonb
      )
      FROM (
        SELECT sr3.city AS city, count(*)::int AS cnt
        FROM public.service_requests sr3
        WHERE sr3.city IS NOT NULL AND btrim(sr3.city) <> ''
        GROUP BY sr3.city
      ) c
    )
  )
  INTO v_summary;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total, 'summary', v_summary);
END;
$$;

REVOKE ALL ON FUNCTION public.get_requests_admin(text, text, text, date, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_requests_admin(text, text, text, date, integer, integer) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional, correr después)
-- ─────────────────────────────────────────────────────────────────────────────
-- Primer lote de solicitudes activas:
--   SELECT public.get_requests_admin('new', NULL, NULL, NULL, 20, 0);
-- Todas, filtrando por tipo:
--   SELECT public.get_requests_admin('todos', 'single', NULL, NULL, 20, 0);
