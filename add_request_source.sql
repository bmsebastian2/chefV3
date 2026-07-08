-- ============================================================================
-- Piloto asistente-como-entrada · Medición de origen de la solicitud
--
-- Etiqueta cada solicitud con su origen ('assistant' cuando nace de la puerta
-- conversacional /asistente; NULL cuando entra directo al wizard). Con eso se
-- compara la conversión del piloto contra el flujo directo.
--
-- Mismo patrón que set_request_pending / update_request_budget: un RPC chico
-- SECURITY DEFINER que actualiza la fila DESPUÉS del insert, en vez de tocar
-- create_service_request (que no se modifica). El submit lo llama con el cliente
-- del usuario (anon/authenticated); create_service_request funciona sin GRANT
-- explícito (EXECUTE a PUBLIC por defecto), así que esta función también.
-- ============================================================================

-- 1. Columna de origen (idempotente)
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 2. RPC para setear el origen tras el insert
CREATE OR REPLACE FUNCTION set_request_source(
  p_request_id UUID,
  p_source     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_requests
     SET source = p_source
   WHERE id = p_request_id;
END;
$$;
