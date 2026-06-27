import { dlocalgoGetPayment } from '@/lib/dlocalgo';
import { createAdminClient } from '@/utils/supabase/admin';

const STATUS_MAP: Record<string, string> = {
  PAID:      'completed',
  PENDING:   'pending',
  REJECTED:  'failed',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
};

/**
 * Fuente de verdad del estado de un pago. Re-consulta a dLocalGo con nuestras
 * credenciales (no se confía en ningún input externo) y aplica el resultado de
 * forma IDEMPOTENTE: actualiza `payments.status` y, si está `PAID`, marca
 * `proposals.status = 'accepted'`.
 *
 * La usan dos caminos, por eso el sistema es robusto:
 *  - el webhook (async, lo llama dLocalGo)
 *  - el retorno de éxito del cliente (sync, `?payment=success`)
 * Si uno falla o se demora, el otro cierra el pago igual.
 */
export async function applyDlocalgoPaymentStatus(
  dlocalgoPaymentId: string,
): Promise<{ status?: string; paid?: boolean; error?: string }> {
  const payment = await dlocalgoGetPayment(dlocalgoPaymentId);
  if (!payment || typeof payment.status !== 'string') {
    console.error('[dlocalgo-verify] no se pudo verificar el pago:', dlocalgoPaymentId, payment);
    return { error: 'payment lookup failed' };
  }

  const admin = createAdminClient();
  const mappedStatus = STATUS_MAP[payment.status] ?? payment.status.toLowerCase();

  // 1) Camino normal: la fila ya existe (se insertó en create-payment). UPDATE de estado.
  //    `maybeSingle()` (NO `single()`) para que "no hay fila" deje de ser un error: ese
  //    es justamente el caso del re-cobro por "Volver", que reconciliamos en el paso 2.
  const { data: updatedRecord, error: updateError } = await admin
    .from('payments')
    .update({ status: mappedStatus })
    .eq('dlocalgo_payment_id', dlocalgoPaymentId)
    .select('proposal_id, request_id')
    .maybeSingle();

  if (updateError) {
    console.error('🛑 dlocalgo-verify: fallo update `payments`', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });
    return { error: 'payments update failed' };
  }

  let record = updatedRecord;

  // 2) Reconciliación de cobro HUÉRFANO: no existía fila para este dlocalgo_payment_id.
  //    Pasa cuando el usuario toca "Volver" en la pasarela y re-paga DENTRO de dLocalGo:
  //    ese cobro tiene un id que nunca insertamos, así que el webhook no tenía nada que
  //    actualizar y el pago quedaba fantasma (cobrado pero invisible en la base). Acá lo
  //    INSERTAMOS desde la metadata que mandamos al crear el pago → NUNCA es invisible.
  if (!record) {
    const meta = (payment.metadata ?? {}) as {
      user_id?: string; proposal_id?: string; request_id?: string;
    };
    const amount = Number(payment.amount);
    if (!meta.user_id || !meta.proposal_id || !meta.request_id || !Number.isFinite(amount)) {
      // Sin metadata no podemos atribuir el cobro: 502 para que dLocalGo reintente y
      // quede traza en logs para reconciliación manual del admin.
      console.error('🛑 dlocalgo-verify: cobro huérfano sin metadata, no se puede reconciliar', {
        dlocalgoPaymentId, metadata: payment.metadata, amount: payment.amount,
      });
      return { error: 'orphan payment without metadata' };
    }
    // upsert idempotente por dlocalgo_payment_id: si dLocalGo reintenta el webhook del
    // mismo id, no duplica la fila.
    const { data: inserted, error: insertError } = await admin
      .from('payments')
      .upsert({
        user_id:             meta.user_id,
        dlocalgo_payment_id: dlocalgoPaymentId,
        proposal_id:         meta.proposal_id,
        request_id:          meta.request_id,
        amount,
        currency:            typeof payment.currency === 'string' ? payment.currency : 'USD',
        status:              mappedStatus,
      }, { onConflict: 'dlocalgo_payment_id' })
      .select('proposal_id, request_id')
      .single();
    if (insertError) {
      console.error('🛑 dlocalgo-verify: fallo al reconciliar cobro huérfano', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return { error: 'orphan payment reconcile failed' };
    }
    record = inserted;
    console.warn('⚠️ dlocalgo-verify: cobro huérfano reconciliado (re-pago por "Volver")', {
      dlocalgoPaymentId, request_id: meta.request_id, status: mappedStatus,
    });
  }

  const paid = payment.status === 'PAID';
  if (record && paid) {
    const { error: propError } = await admin
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', record.proposal_id)
      .eq('request_id', record.request_id);
    if (propError) {
      console.error('🛑 dlocalgo-verify: fallo update `proposals`', {
        message: propError.message,
        code: propError.code,
      });
      return { error: 'proposals update failed' };
    }

    // Crear el booking (escrow). Idempotente: un solo booking por propuesta,
    // aunque webhook y retorno de éxito disparen ambos. Acá es donde `bookings`
    // empieza a poblarse — antes nunca se creaba.
    const { error: bookingError } = await admin.rpc('create_booking_for_payment', {
      p_dlocalgo_payment_id: dlocalgoPaymentId,
    });
    if (bookingError) {
      // Devolver error para que el webhook reintente (5xx) y no se pierda el booking.
      console.error('🛑 dlocalgo-verify: fallo create_booking_for_payment', {
        message: bookingError.message,
        code: bookingError.code,
        details: bookingError.details,
        hint: bookingError.hint,
      });
      return { error: 'booking creation failed' };
    }
  }

  return { status: mappedStatus, paid };
}
