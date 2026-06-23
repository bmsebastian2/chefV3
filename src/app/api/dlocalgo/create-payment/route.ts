import { dlocalgoRequest } from '@/lib/dlocalgo';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { amount: realAmount, currency: _currency, proposalId, requestId } = await req.json();
    if (!realAmount || !proposalId || !requestId) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
    }

    // ⚠️ MONTO FIJO DE PRUEBA ($2) ACTIVO EN PRODUCCIÓN — quitar al pasar a cobro real.
    console.warn("⚠️ create-payment: monto fijo de prueba ($2 USD) activo.");
    // TODO_PROD: ⚠️ MONTO DE PRUEBA — cambiar a `realAmount` antes de cobro real
    // const amount = realAmount; const currency = _currency ?? 'USD';
    const amount = 2; const currency = 'USD'; // solo para testing
    // FIN_TODO_PROD ⚠️

    // ── Guarda: el monto debe ser un número finito y > 0 antes de enviarse ──
    // dLocalGo registra "USD-" (monto vacío) cuando recibe un amount null/NaN/0.
    // Esta validación evita que se cree un pago con monto inválido.
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      console.error('🛑 create-payment: amount inválido, NO se envía a dLocalGo:', { amount, currency });
      return NextResponse.json({ error: 'Monto de pago inválido' }, { status: 400 });
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

    // dLocalGo bloquea (deshabilita) los campos del payer que recibe pre-cargados.
    // Si mandamos un nombre placeholder, el cliente no puede editarlo. Traemos el
    // nombre real; si no lo tenemos, omitimos `name` para que el campo quede editable.
    const { data: profile } = await supabase
      .from('users')
      .select('first_name, first_surname')
      .eq('id', user.id)
      .single();

    const payerName = [profile?.first_name, profile?.first_surname]
      .filter(Boolean)
      .join(' ')
      .trim()
      || (user.user_metadata?.full_name as string | undefined)?.trim()
      || '';

    const result = await dlocalgoRequest('/payments', {
      amount: amountNumber,
      currency,
      country_code: 'UY',
      description: 'Reserva de chef privado - GetChef',
      success_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}?payment=success`,
      back_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}/payment`,
      notification_url: `${appUrl}/api/dlocalgo/webhook`,
      payer: {
        ...(payerName ? { name: payerName } : {}),
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
      amount: realAmount,
      currency: _currency ?? 'USD',
      status: 'pending',
    });

    return NextResponse.json({ redirect_url: result.redirect_url });
  } catch (err) {
    console.error('create-payment unhandled error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
