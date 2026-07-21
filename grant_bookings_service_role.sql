-- Fix: UPDATE en `bookings` fallaba con 42501 "permission denied for table bookings".
--
-- Causa: hasta ahora TODA escritura en `bookings` pasaba por funciones
-- SECURITY DEFINER (create_booking_for_payment, complete_booking,
-- admin_cancel_booking, mark_refund_processed, release_payout) — dueñas de
-- postgres, que no necesitan el GRANT del rol que las llama. El admin client
-- (service role) bypassa RLS, pero el bypass no sirve si el rol no tiene
-- siquiera el GRANT de tabla.
--
-- notifyChefOfBookingConfirmed() es la primera escritura DIRECTA (sin RPC) a
-- `bookings` desde JS — el claim atómico de chef_notified_at vía admin client.
-- Sin esto, el email de "reserva confirmada" nunca se envía y el error queda
-- silencioso salvo por el console.error.
--
-- Mismo patrón que payments (grant_payments_service_role.sql) y chef_photos.

GRANT ALL ON TABLE public.bookings TO service_role;
