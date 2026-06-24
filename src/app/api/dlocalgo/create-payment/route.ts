import { dlocalgoRequest } from '@/lib/dlocalgo';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // El cliente NO manda el monto: solo la propuesta, el request y los comensales.
    // El total lo calcula el servidor (ver más abajo) para no confiar en un valor manipulable.
    const { proposalId, requestId, guests } = await req.json();
    if (!proposalId || !requestId || !guests) {
      console.error('🛑 create-payment: parámetros faltantes', { proposalId, requestId, guests });
      return NextResponse.json({
        error: 'Parámetros faltantes',
        missing: { proposalId: !proposalId, requestId: !requestId, guests: !guests },
      }, { status: 400 });
    }

    const guestsNumber = Number(guests);
    if (!Number.isInteger(guestsNumber) || guestsNumber <= 0) {
      console.error('🛑 create-payment: guests inválido', { guests });
      return NextResponse.json({ error: 'Cantidad de comensales inválida' }, { status: 400 });
    }

    // Verify the client owns this request
    const { data: request } = await supabase
      .from('service_requests')
      .select('id')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single();
    if (!request) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 403 });

    // ── Monto AUTORITATIVO: calculado en el servidor desde el precio de la propuesta ──
    // Nunca se confía en un total mandado por el cliente (si no, podría pagar $1 por un
    // servicio de $378). total = price_per_person × guests.
    const { data: proposal } = await supabase
      .from('proposals')
      .select('price_per_person')
      .eq('id', proposalId)
      .eq('request_id', requestId)
      .single();
    const pricePerPerson = Number(proposal?.price_per_person);
    if (!proposal || !Number.isFinite(pricePerPerson) || pricePerPerson <= 0) {
      console.error('🛑 create-payment: propuesta sin precio válido', { proposalId, pricePerPerson });
      return NextResponse.json({ error: 'Propuesta sin precio válido' }, { status: 400 });
    }

    const amountNumber = pricePerPerson * guestsNumber;
    const currency = 'USD';
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      console.error('🛑 create-payment: monto calculado inválido', { pricePerPerson, guestsNumber, amountNumber });
      return NextResponse.json({ error: 'Monto de pago inválido' }, { status: 400 });
    }

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
    const { error: insertError } = await admin.from('payments').insert({
      user_id: user.id,
      dlocalgo_payment_id: result.id,
      proposal_id: proposalId,
      request_id: requestId,
      amount: amountNumber,
      currency,
      status: 'pending',
    });

    // Antes este error se tragaba en silencio: si el insert falla, no hay fila en
    // `payments` y el webhook nunca puede marcar el pago/propuesta → pago infinito.
    if (insertError) {
      console.error('🛑 create-payment: fallo al insertar en `payments`', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
    }

    return NextResponse.json({ redirect_url: result.redirect_url });
  } catch (err) {
    console.error('create-payment unhandled error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
