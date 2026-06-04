import { dlocalgoGetPayment } from '@/lib/dlocalgo';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

const STATUS_MAP: Record<string, string> = {
  PAID:      'completed',
  REJECTED:  'failed',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
};

export async function POST(req: Request) {
  const body = await req.json();
  const { payment_id } = body;
  if (!payment_id) return NextResponse.json({ error: 'missing payment_id' }, { status: 400 });

  const payment = await dlocalgoGetPayment(payment_id);

  const admin = createAdminClient();

  const mappedStatus = STATUS_MAP[payment.status] ?? payment.status;

  const { data: record } = await admin
    .from('payments')
    .update({ status: mappedStatus })
    .eq('dlocalgo_payment_id', payment_id)
    .select('proposal_id, request_id')
    .single();

  if (record && payment.status === 'PAID') {
    await admin
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', record.proposal_id)
      .eq('request_id', record.request_id);
  }

  return NextResponse.json({ received: true });
}
