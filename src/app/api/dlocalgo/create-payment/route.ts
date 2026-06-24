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
      // Log explícito: este 400 antes salía sin rastro en Vercel. `realAmount` es el
      // sospechoso típico — llega 0 (falsy) cuando la propuesta no tiene price_per_person.
      console.error('🛑 create-payment: parámetros faltantes', {
        realAmount, currency: _currency, proposalId, requestId,
      });
      return NextResponse.json({
        error: 'Parámetros faltantes',
        missing: { realAmount: !realAmount, proposalId: !proposalId, requestId: !requestId },
      }, { status: 400 });
    }

    // ⚠️ MONTO FIJO DE PRUEBA ($20) ACTIVO EN PRODUCCIÓN — quitar al pasar a cobro real.
    // Se subió de $2 a $20 porque dLocalGo rechazaba el micro-monto por riesgo
    // (errorCode 818 "Rejected due to high risk" = heurística de card-testing).
    console.warn("⚠️ create-payment: monto fijo de prueba ($20 USD) activo.");
    // TODO_PROD: ⚠️ MONTO DE PRUEBA — cambiar a `realAmount` antes de cobro real
    // const amount = realAmount; const currency = _currency ?? 'USD';
    const amount = 20; const currency = 'USD'; // solo para testing
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

    // Base URL para success/back/notification. dLocalGo recibe la notification_url
    // por pago, así que si esto queda en localhost el webhook NUNCA llega en prod.
    // Fallback a NEXT_PUBLIC_URL (seteada a prod) y strip del "/" final para no
    // generar "//api/...". Mismo patrón que client-emails.ts / wizard/actions.ts.
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_URL ??
      'http://localhost:3000'
    ).replace(/\/$/, '');

    if (appUrl.includes('localhost')) {
      console.warn('⚠️ create-payment: appUrl apunta a localhost — webhook y URLs de retorno no funcionarán en producción. Configurá NEXT_PUBLIC_APP_URL en Vercel.');
    }

    // NO mandamos `payer.name`: dLocalGo pre-carga Y bloquea ese campo, y si el
    // titular real de la tarjeta es distinto al usuario logueado (nombre del payer
    // ≠ nombre del titular) el antifraude lo marca como alto riesgo. Omitiéndolo,
    // el campo queda editable y el titular escribe su propio nombre (que coincide
    // con la tarjeta). El email sí lo dejamos pre-cargado.
    const result = await dlocalgoRequest('/payments', {
      amount: amountNumber,
      currency,
      country_code: 'UY',
      description: 'Reserva de chef privado - GetChef',
      success_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}?payment=success`,
      back_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}/payment`,
      notification_url: `${appUrl}/api/dlocalgo/webhook`,
      payer: {
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
