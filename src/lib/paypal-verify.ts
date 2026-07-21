// ============================================================================
// Fuente de verdad del estado de un pago PayPal. Espejo de lib/dlocalgo-verify.ts.
//
// Principio idéntico: NO se confía en ningún input externo (ni el redirect del
// navegador, ni el body del webhook). Se re-consulta la orden a PayPal con
// nuestras credenciales y se aplica el resultado de forma IDEMPOTENTE.
//
// La usan dos caminos, por eso el sistema es robusto:
//   · el webhook PAYMENT.CAPTURE.* (async, lo llama PayPal)  ← fuente de verdad
//   · la ruta de captura / reconciliación (sync, tras el redirect)
// Si uno falla o se demora, el otro cierra el pago igual.
// ============================================================================

import { paypalGet } from '@/lib/paypal';
import { createAdminClient } from '@/utils/supabase/admin';
import { notifyChefOfBookingConfirmed } from '@/lib/emails/notify-chefs';

// ── Vocabulario de estados ───────────────────────────────────────────────────
// Se reusa el MISMO de dLocalGo (pending/completed/failed/expired/cancelled):
// `payments.status` es leído por los guards, por el panel admin y por los RPCs
// de reembolso, que no saben ni deben saber de proveedores.
const CAPTURE_STATUS_MAP: Record<string, string> = {
  COMPLETED:          'completed',
  PENDING:            'pending',
  DECLINED:           'failed',
  FAILED:             'failed',
  // Un cobro reembolsado SIGUE siendo un cobro que ocurrió: no se degrada a
  // 'failed'. El reembolso se rastrea aparte, en payments.refund_status.
  REFUNDED:           'completed',
  PARTIALLY_REFUNDED: 'completed',
};

// Cuando todavía no hay captura, el estado sale de la orden.
const ORDER_STATUS_MAP: Record<string, string> = {
  CREATED:               'pending',
  SAVED:                 'pending',
  PAYER_ACTION_REQUIRED: 'pending',
  APPROVED:              'pending',  // aprobada pero SIN capturar: la plata no se movió
  COMPLETED:             'completed',
  VOIDED:                'cancelled',
};

type PaypalOrder = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    invoice_id?: string;
    amount?: { value?: string; currency_code?: string };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
};

/**
 * `custom_id` viaja como "userId:proposalId:requestId" y no como JSON a propósito:
 * PayPal limita el campo a 127 caracteres y tres UUIDs con llaves JSON no entran.
 * Es nuestra única forma de atribuir un cobro huérfano.
 */
function parseCustomId(customId: string | undefined) {
  const parts = (customId ?? '').split(':');
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  const [user_id, proposal_id, request_id] = parts;
  return { user_id, proposal_id, request_id };
}

export function buildCustomId(userId: string, proposalId: string, requestId: string): string {
  return `${userId}:${proposalId}:${requestId}`;
}

/**
 * Aplica a nuestra base el estado real de una orden PayPal.
 *
 * @param orderId  El ORDER id (lo que guardamos en payments.dlocalgo_payment_id).
 *                 No el capture id — ver el COMMENT de la columna en la migración.
 */
export async function applyPaypalOrderStatus(
  orderId: string,
): Promise<{ status?: string; paid?: boolean; error?: string }> {

  const { ok, data: order } = await paypalGet<PaypalOrder>(`/v2/checkout/orders/${orderId}`);
  if (!ok || typeof order?.status !== 'string') {
    console.error('[paypal-verify] no se pudo verificar la orden:', orderId, order);
    return { error: 'order lookup failed' };
  }

  const unit    = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  // El estado de la CAPTURA manda sobre el de la orden: una orden puede figurar
  // COMPLETED mientras la captura quedó PENDING (revisión antifraude de PayPal),
  // y en ese caso la plata todavía no es nuestra.
  const mappedStatus = capture?.status
    ? (CAPTURE_STATUS_MAP[capture.status] ?? capture.status.toLowerCase())
    : (ORDER_STATUS_MAP[order.status] ?? order.status.toLowerCase());

  const paid = capture?.status === 'COMPLETED';

  const admin = createAdminClient();

  // ── 1 · Camino normal: la fila ya existe (insertada en create-order) ───────
  // `maybeSingle()` (NO `single()`) para que "no hay fila" no sea un error: ese
  // es el caso del cobro huérfano, que se reconcilia en el paso 2.
  const { data: updatedRecord, error: updateError } = await admin
    .from('payments')
    .update({
      status: mappedStatus,
      // El capture id solo existe una vez capturado. Es el ÚNICO id que sirve
      // para reembolsar, por eso se persiste apenas aparece.
      ...(capture?.id ? { provider_capture_id: capture.id } : {}),
    })
    .eq('dlocalgo_payment_id', orderId)
    .select('proposal_id, request_id')
    .maybeSingle();

  if (updateError) {
    console.error('🛑 paypal-verify: fallo update `payments`', {
      message: updateError.message,
      code:    updateError.code,
      details: updateError.details,
      hint:    updateError.hint,
    });
    return { error: 'payments update failed' };
  }

  let record = updatedRecord;

  // ── 2 · Reconciliación de cobro HUÉRFANO ──────────────────────────────────
  // No existía fila para este order id. En PayPal el caso típico no es el mismo
  // que en dLocalGo: acá pasa si el INSERT de create-order falló pero la orden ya
  // se había creado en PayPal. Lo insertamos desde el custom_id que mandamos al
  // crear la orden → un cobro NUNCA queda invisible en la base.
  if (!record) {
    const meta   = parseCustomId(unit?.custom_id);
    const amount = Number(capture?.amount?.value ?? unit?.amount?.value);

    if (!meta || !Number.isFinite(amount)) {
      // Sin metadata no podemos atribuir el cobro: error para que PayPal reintente
      // y quede traza en logs para reconciliación manual del admin.
      console.error('🛑 paypal-verify: cobro huérfano sin custom_id utilizable', {
        orderId, custom_id: unit?.custom_id, amount: capture?.amount?.value,
      });
      return { error: 'orphan payment without metadata' };
    }

    // upsert idempotente por dlocalgo_payment_id: si PayPal reintenta el webhook
    // del mismo order id, no duplica la fila.
    const { data: inserted, error: insertError } = await admin
      .from('payments')
      .upsert({
        user_id:             meta.user_id,
        dlocalgo_payment_id: orderId,
        provider:            'paypal',
        provider_capture_id: capture?.id ?? null,
        proposal_id:         meta.proposal_id,
        request_id:          meta.request_id,
        amount,
        currency:            capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? 'USD',
        status:              mappedStatus,
      }, { onConflict: 'dlocalgo_payment_id' })
      .select('proposal_id, request_id')
      .single();

    if (insertError) {
      console.error('🛑 paypal-verify: fallo al reconciliar cobro huérfano', {
        message: insertError.message,
        code:    insertError.code,
        details: insertError.details,
        hint:    insertError.hint,
      });
      return { error: 'orphan payment reconcile failed' };
    }

    record = inserted;
    console.warn('⚠️ paypal-verify: cobro huérfano reconciliado', {
      orderId, request_id: meta.request_id, status: mappedStatus,
    });
  }

  // ── 3 · Pago confirmado → aceptar propuesta + crear booking (escrow) ──────
  if (record && paid) {
    const { error: propError } = await admin
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', record.proposal_id)
      .eq('request_id', record.request_id);
    if (propError) {
      console.error('🛑 paypal-verify: fallo update `proposals`', {
        message: propError.message,
        code:    propError.code,
      });
      return { error: 'proposals update failed' };
    }

    // MISMO RPC que dLocalGo, sin cambios: recibe el identificador de orden que
    // guardamos en dlocalgo_payment_id y toma el monto autoritativo de payments.
    // Idempotente: un solo booking por propuesta, aunque webhook y captura
    // disparen ambos.
    const { data: bookingId, error: bookingError } = await admin.rpc('create_booking_for_payment', {
      p_dlocalgo_payment_id: orderId,
    });
    if (bookingError) {
      // Devolver error para que el webhook reintente (5xx) y no se pierda el booking.
      console.error('🛑 paypal-verify: fallo create_booking_for_payment', {
        message: bookingError.message,
        code:    bookingError.code,
        details: bookingError.details,
        hint:    bookingError.hint,
      });
      return { error: 'booking creation failed' };
    }

    // bookingId puede venir NULL (booking huérfano, ver create_booking_for_payment).
    // Se espera (no fire-and-forget): esta función corre en un Route Handler, y
    // sin `await` el runtime serverless puede congelar la lambda antes de que el
    // email salga. El claim atómico interno evita duplicados si el webhook
    // reintenta o corre en paralelo con la ruta de captura.
    if (bookingId) {
      await notifyChefOfBookingConfirmed(bookingId as string).catch((err) =>
        console.error('[paypal-verify] notifyChefOfBookingConfirmed failed:', err)
      );
    }
  }

  return { status: mappedStatus, paid };
}

/**
 * Reembolso notificado por PayPal (PAYMENT.CAPTURE.REFUNDED).
 *
 * DECISIÓN DELIBERADA: esto NO cierra `refund_status` en la base. El flujo de
 * reembolsos del admin (mark_refund_processed) exige un refund_ref no vacío y
 * audita quién lo ejecutó (refunded_by). Si el webhook escribiera el estado
 * solo, abriríamos una vía que marca plata como devuelta sin admin identificado
 * — justo la auditoría que esa migración se puso a cerrar.
 *
 * Entonces: dejamos traza estructurada para que el admin concilie, y él cierra
 * el reembolso desde el panel con el refund id que PayPal reporta acá.
 */
export async function logPaypalRefund(event: {
  refundId?:  string;
  captureId?: string;
  amount?:    string;
  currency?:  string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from('payments')
    .select('id, request_id, proposal_id, amount, status')
    .eq('provider_capture_id', event.captureId ?? '')
    .maybeSingle();

  console.warn('💸 paypal-verify: REEMBOLSO notificado por PayPal — requiere cierre manual del admin', {
    refund_id:  event.refundId,
    capture_id: event.captureId,
    monto:      `${event.amount ?? '?'} ${event.currency ?? ''}`.trim(),
    payment_id: payment?.id     ?? '(no encontrado en payments)',
    request_id: payment?.request_id ?? null,
    accion:     'cerrar en el panel admin usando refund_ref = refund_id de arriba',
  });
}
