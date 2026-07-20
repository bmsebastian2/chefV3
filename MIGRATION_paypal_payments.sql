-- ============================================================================
-- PayPal como segundo medio de cobro — cambios de esquema en `payments`
--
-- CÓMO USAR: pegar en el SQL Editor de Supabase y ejecutar una vez.
-- Idempotente: se puede re-correr sin romper.
--
-- PayPal NO es otro flujo: es otro medio de cobro sobre el MISMO modelo de
-- escrow (bookings.payment_status / payout_status / payment_ref). Por eso acá
-- no se crea ninguna tabla nueva ni se toca `bookings`: solo se agregan las dos
-- columnas mínimas para distinguir el proveedor y poder reembolsar.
-- ============================================================================


-- ── 1 · Proveedor del cobro ──────────────────────────────────────────────────
-- DEFAULT 'dlocalgo' backfillea las filas existentes sin UPDATE explícito:
-- todo lo cobrado hasta hoy fue por tarjeta vía dLocalGo.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'dlocalgo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_provider_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_provider_check
      CHECK (provider IN ('dlocalgo', 'paypal'));
  END IF;
END $$;


-- ── 2 · Capture id de PayPal ─────────────────────────────────────────────────
-- PayPal tiene DOS identificadores por cobro y no son intercambiables:
--   · order id   → se genera al crear la orden, antes de que el usuario pague.
--   · capture id → se genera al capturar (cuando la plata se mueve de verdad),
--                  y es el ÚNICO que sirve para reembolsar
--                  (POST /v2/payments/captures/{capture_id}/refund).
-- Guardamos el order id en `dlocalgo_payment_id` (ver nota del punto 3) porque
-- es el que existe al momento del INSERT, y el capture id acá, que se completa
-- recién cuando el webhook PAYMENT.CAPTURE.COMPLETED confirma el cobro.
-- NULL en todas las filas de dLocalGo: no aplica.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_capture_id text;

-- El webhook de reembolso (PAYMENT.CAPTURE.REFUNDED) llega identificando la
-- CAPTURA, no la orden: sin este índice, mapear el evento a nuestra fila sería
-- un seq scan. UNIQUE además de índice: dos filas no pueden compartir captura.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_capture_id_key
  ON public.payments (provider_capture_id)
  WHERE provider_capture_id IS NOT NULL;


-- ── 3 · Documentar la reutilización de `dlocalgo_payment_id` ─────────────────
-- DECISIÓN CONSCIENTE: la columna NO se renombra pese a que ahora también
-- guarda ids de PayPal. Es la clave de join contra `bookings.payment_ref` y
-- está referenciada por al menos 6 RPCs (create_booking_for_payment,
-- get_all_payments_admin, mark_orphan_payment_refunded, get_pending_refunds_admin,
-- ...). Renombrarla obliga a reescribirlos todos, a cambio de estética.
-- El nombre queda mentiroso; este COMMENT es la mitigación.
COMMENT ON COLUMN public.payments.dlocalgo_payment_id IS
  'Identificador único de la orden en la pasarela. Pese al nombre (histórico, no '
  'renombrado para no romper los joins con bookings.payment_ref ni los RPCs que lo '
  'referencian), guarda el payment id de dLocalGo cuando provider=''dlocalgo'' y el '
  'ORDER id de PayPal cuando provider=''paypal''. Para reembolsar PayPal se usa '
  'provider_capture_id, NO esta columna.';

COMMENT ON COLUMN public.payments.provider IS
  'Medio de cobro: dlocalgo (tarjeta) | paypal. El embudo anti-duplicados NO filtra '
  'por esta columna a propósito: un request ya pagado por cualquier medio bloquea '
  'cualquier otro cobro.';

COMMENT ON COLUMN public.payments.provider_capture_id IS
  'Solo PayPal: id de la captura, requerido para reembolsar. Se completa cuando el '
  'webhook PAYMENT.CAPTURE.COMPLETED confirma el cobro, no al crear la orden.';


-- ── Verificación ─────────────────────────────────────────────────────────────
-- SELECT provider, count(*) FROM public.payments GROUP BY provider;
-- (esperado antes de cobrar nada por PayPal: una sola fila, dlocalgo)
