-- ============================================================================
-- Fase 2 · Pieza 3b — Status 'booked' en service_requests
--
-- Al pagarse una solicitud pasa a 'booked'. Esto la saca del conjunto que el job
-- expire_stale_requests cancela (solo toca 'new'/'active'/'pending'), evitando
-- que una solicitud YA PAGADA se auto-cancele al pasar la fecha del evento.
--
-- Mismo patrón que activate_requests_migration.sql (la tabla usa un CHECK con
-- nombre service_requests_status_check; el error 23514 lo confirma).
-- ============================================================================

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_status_check
  CHECK (status IN (
    'new',
    'active',
    'pending_confirmation',
    'completed',
    'cancelled',
    'pending',
    'booked'          -- NUEVO: solicitud pagada, con booking activo
  ));
