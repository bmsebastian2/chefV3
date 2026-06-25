-- ============================================================================
-- Fase 2 · Pieza 1 — Columnas de ciclo de vida + escrow/comisión/payout en
-- `bookings`, más RLS de SELECT para cliente y chef.
--
-- Opción A: `bookings` es la tabla central del servicio. El dinero del cliente
-- (payment_status), el dinero al chef (payout_status) y el ciclo de vida del
-- servicio (booking_status) son tres dimensiones separadas.
--
-- "Escrow" = payment_status='paid' AND payout_status='pending' (dinero retenido).
--
-- Idempotente: se puede correr más de una vez sin romper nada.
-- NO abre policies de INSERT/UPDATE: todas las escrituras pasan por los RPCs
-- SECURITY DEFINER de las piezas 2-6.
-- ============================================================================

-- ── Columnas nuevas ─────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency           text    NOT NULL DEFAULT 'USD',
  -- Snapshot de la tasa de comisión vigente al crearse el booking. Si la
  -- comisión global cambia después, este servicio conserva la que tenía.
  ADD COLUMN IF NOT EXISTS commission_rate    numeric NOT NULL DEFAULT 0.15,
  -- Comisión en dinero = total_amount * commission_rate (la fija el RPC).
  ADD COLUMN IF NOT EXISTS commission_amount  numeric,
  -- Neto al chef = total_amount - commission_amount (la fija el RPC).
  ADD COLUMN IF NOT EXISTS chef_payout_amount numeric,
  -- Dinero al chef: pending (retenido) → released (transferido) | failed.
  ADD COLUMN IF NOT EXISTS payout_status      text    NOT NULL DEFAULT 'pending',
  -- Referencia del giro manual al chef (lo carga el admin al transferir).
  ADD COLUMN IF NOT EXISTS payout_ref         text,
  ADD COLUMN IF NOT EXISTS completed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS released_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at       timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason      text;

-- ── CHECK de payout_status (idempotente vía DO block) ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payout_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payout_status_check
      CHECK (payout_status IN ('pending', 'released', 'failed'));
  END IF;
END $$;

-- ── RLS: lectura para cliente y chef ────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- El cliente ve los bookings de sus propias solicitudes.
DROP POLICY IF EXISTS "Clients can view their bookings" ON public.bookings;
CREATE POLICY "Clients can view their bookings" ON public.bookings
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.service_requests WHERE user_id = auth.uid()
    )
  );

-- El chef ve los bookings asociados a su perfil.
DROP POLICY IF EXISTS "Chefs can view their bookings" ON public.bookings;
CREATE POLICY "Chefs can view their bookings" ON public.bookings
  FOR SELECT USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE user_id = auth.uid()
    )
  );
