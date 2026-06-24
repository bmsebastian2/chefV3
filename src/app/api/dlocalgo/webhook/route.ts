import { dlocalgoGetPayment } from '@/lib/dlocalgo';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

const STATUS_MAP: Record<string, string> = {
  PAID:      'completed',
  PENDING:   'pending',
  REJECTED:  'failed',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
};

export async function POST(req: Request) {
  const body = await req.json();
  // Log del body crudo: confirma qué campo manda dLocalGo y traza por qué (no) actualiza.
  console.log('📩 webhook recibido:', JSON.stringify(body));
  const { payment_id } = body;
  if (!payment_id) return NextResponse.json({ error: 'missing payment_id' }, { status: 400 });

  // El webhook no está firmado: la fuente de verdad es re-consultar el pago a la API
  // con nuestras credenciales. Si esa consulta falla (sin status), NO escribimos nada
  // y devolvemos 5xx para que dLocalGo reintente — evita pisar el registro con basura.
  const payment = await dlocalgoGetPayment(payment_id);
  if (!payment || typeof payment.status !== 'string') {
    console.error('[dlocalgo webhook] no se pudo verificar el pago:', payment_id, payment);
    return NextResponse.json({ error: 'payment lookup failed' }, { status: 502 });
  }

  const admin = createAdminClient();

  const mappedStatus = STATUS_MAP[payment.status] ?? payment.status.toLowerCase();
  console.log('🔎 webhook: dLocalGo status', payment.status, '→', mappedStatus, '| payment_id', payment_id);

  const { data: record, error: updateError } = await admin
    .from('payments')
    .update({ status: mappedStatus })
    .eq('dlocalgo_payment_id', payment_id)
    .select('proposal_id, request_id')
    .single();

  // Si no hay fila que matchee (porque el insert de create-payment falló) o RLS bloquea,
  // esto lo deja explícito en vez de fallar mudo.
  if (updateError) {
    console.error('🛑 webhook: fallo update `payments` (¿0 filas o RLS/service-role?)', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });
  }

  if (record && payment.status === 'PAID') {
    await admin
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', record.proposal_id)
      .eq('request_id', record.request_id);
  }

  return NextResponse.json({ received: true });
}
