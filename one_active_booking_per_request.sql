-- ============================================================================
-- Integridad: UN SOLO booking activo por service_request.
--
-- Red de seguridad contra el doble-pago: aunque fallen los chequeos de backend
-- (create-payment) y de la confirmación (create_booking_for_payment), esto hace
-- IMPOSIBLE que existan dos bookings no-cancelados para el mismo request, incluso
-- bajo condición de carrera (dos pagos casi simultáneos de propuestas distintas).
--
-- Activo = booking_status <> 'cancelled' (confirmed o completed). Un booking
-- cancelado libera el request → se puede reservar otra propuesta.
--
-- Convive con el UNIQUE(proposal_id) existente (1 booking por propuesta).
-- Requiere: cero duplicados activos preexistentes (confirmado: la tabla no los tiene).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_request
  ON public.bookings (request_id)
  WHERE booking_status <> 'cancelled';
