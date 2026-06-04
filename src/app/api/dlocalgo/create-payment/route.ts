import { dlocalgoRequest } from '@/lib/dlocalgo';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { amount, currency = 'UYU', proposalId, requestId } = await req.json();
    if (!amount || !proposalId || !requestId) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
    }

    // Verify the client owns this request
    const { data: request } = await supabase
      .from('service_requests')
      .select('id')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single();
    if (!request) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 403 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const result = await dlocalgoRequest('/payments', {
      amount,
      currency,
      country_code: 'UY',
      description: 'Reserva de chef privado - GetChef',
      success_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}?payment=success`,
      back_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}/payment`,
      notification_url: `${appUrl}/api/dlocalgo/webhook`,
      payer: {
        name: user.user_metadata?.full_name ?? 'Cliente',
        email: user.email,
      },
      metadata: {
        user_id: user.id,
        proposal_id: proposalId,
        request_id: requestId,
      },
    });

    if (!result.redirect_url) {
      console.error('dlocalgo create-payment error:', result);
      return NextResponse.json({ error: result.message ?? 'Error creando pago' }, { status: 500 });
    }

    const admin = createAdminClient();
    await admin.from('payments').insert({
      user_id: user.id,
      dlocalgo_payment_id: result.id,
      proposal_id: proposalId,
      request_id: requestId,
      amount,
      currency,
      status: 'pending',
    });

    return NextResponse.json({ redirect_url: result.redirect_url });
  } catch (err) {
    console.error('create-payment unhandled error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
