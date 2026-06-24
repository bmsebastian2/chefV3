-- Fix: INSERT/UPDATE en `payments` fallaban con 42501 "permission denied for table payments".
--
-- Causa: la tabla `payments` se creó a mano sin otorgar privilegios a `service_role`.
-- El admin client (service role) bypassa RLS, pero el bypass no sirve si el rol no tiene
-- siquiera el GRANT de tabla. Sin esto:
--   - create-payment no inserta la fila 'pending' (error silencioso)
--   - el webhook no puede marcar el pago/propuesta → se podía pagar la misma propuesta infinito
--
-- Mismo patrón que chef_photos y los RPC SECURITY DEFINER de este proyecto.

GRANT ALL ON TABLE public.payments TO service_role;

-- Solo si payments.id es serial/identity (no UUID): el insert necesita la secuencia.
-- Inocuo si no aplica.
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
