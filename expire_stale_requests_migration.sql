-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: expiración automática de solicitudes sin booking/pago
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere: pg_cron habilitado (Database → Extensions → pg_cron)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar columna cancel_reason si no existe aún
--    (ya existe si corriste el cancelRequest de client-dashboard/actions.ts,
--     de lo contrario este ALTER la crea)

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS cancel_reason  TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función que expira las solicitudes cuya fecha de evento ya pasó
--    y que nunca llegaron a completarse ni se cancelaron manualmente.
--
--    Criterios de expiración:
--      · status IN ('new', 'active', 'pending') → solicitud abierta sin chef asignado/pago
--      · event_date_start < CURRENT_DATE        → la fecha del evento ya pasó
--
--    Nota: 'pending_confirmation' queda excluida a propósito; esos registros
--    los limpia el job pre-existente de 7 días.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_stale_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.service_requests
    SET
      status        = 'cancelled',
      cancel_reason = 'HA CADUCADO',
      cancelled_at  = now()
    WHERE
      status IN ('new', 'active', 'pending')
      AND event_date_start < CURRENT_DATE
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION expire_stale_requests() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION expire_stale_requests() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Programar el job con pg_cron
--    Corre cada día a medianoche (UTC-0).
--    Si tu audiencia es Uruguay (UTC-3), podés usar '0 3 * * *'
--    para que sea medianoche hora local.
--
--    IMPORTANTE: ejecutar este bloque DESPUÉS de habilitar pg_cron.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'expire-stale-requests',   -- nombre del job (único)
  '0 3 * * *',               -- 03:00 UTC = 00:00 Uruguay (UTC-3)
  $cron$
    SELECT expire_stale_requests();
  $cron$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional, correr después)
-- ─────────────────────────────────────────────────────────────────────────────

-- Ver el job agendado:
--   SELECT * FROM cron.job WHERE jobname = 'expire-stale-requests';

-- Probar la función manualmente:
--   SELECT expire_stale_requests();

-- Ver cuántos registros afectaría antes de ejecutar:
--   SELECT count(*) FROM public.service_requests
--   WHERE status IN ('new', 'active', 'pending')
--     AND event_date_start < CURRENT_DATE;
