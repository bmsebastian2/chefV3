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

  const { data: record, error: updateError } = await admin
    .from('payments')
    .update({ status: mappedStatus })
    .eq('dlocalgo_payment_id', dlocalgoPaymentId)
    .select('proposal_id, request_id')
    .single();

  if (updateError) {
    console.error('🛑 dlocalgo-verify: fallo update `payments`', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });
    return { error: 'payments update failed' };
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
