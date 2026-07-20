import { dlocalgoRequest } from '@/lib/dlocalgo';
import { applyDlocalgoPaymentStatus } from '@/lib/dlocalgo-verify';
import { assertRequestPayable, computeTotal, resolveAppUrl } from '@/lib/payment-guards';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

const LABEL = 'create-payment';

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

    // ── Embudo anti-duplicados COMPARTIDO con PayPal ──────────────────────────
    // Propiedad del request, propuesta pagable con precio válido, sin pago
    // completado (por CUALQUIER medio) y sin booking activo. La lógica vivía
    // inline acá; se movió a lib/payment-guards.ts sin cambios de comportamiento
    // para que todos los medios de cobro pasen por el mismo candado.
    const admin = createAdminClient();
    const gate  = await assertRequestPayable({
      supabase, admin,
      userId: user.id, requestId, proposalId,
      label:  LABEL,
    });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const currency     = 'USD';
    const amountNumber = computeTotal(gate.pricePerPerson, guestsNumber);
    if (amountNumber === null) {
      console.error(`🛑 ${LABEL}: monto calculado inválido`, {
        pricePerPerson: gate.pricePerPerson, guestsNumber,
      });
      return NextResponse.json({ error: 'Monto de pago inválido' }, { status: 400 });
    }

    // Base URL para success/back/notification. dLocalGo recibe la notification_url
    // por pago, así que si esto queda en localhost el webhook NUNCA llega en prod.
    const appUrl = resolveAppUrl(LABEL);

    // NO mandamos `payer.name`: dLocalGo pre-carga Y bloquea ese campo, y si el
    // titular real de la tarjeta es distinto al usuario logueado (nombre del payer
    // ≠ nombre del titular) el antifraude lo marca como alto riesgo. Omitiéndolo,
    // el campo queda editable y el titular escribe su propio nombre (que coincide
    // con la tarjeta). El email sí lo dejamos pre-cargado.
    const result = await dlocalgoRequest('/payments', {
      amount: amountNumber,
      currency,
      country_code: 'UY',
      // order_id atado al REQUEST (no al intento): agrupa todos los cobros de una misma
      // solicitud bajo un identificador propio. Sirve para trazar/reconciliar en el panel
      // de dLocalGo un cobro huérfano (ej. re-pago por "Volver") contra su request. La
      // idempotencia real la garantiza nuestra base (payments + índices de booking); esto
      // es trazabilidad, no el candado.
      order_id: requestId,
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
      // dLocalGo rechaza un order_id ya usado ("Order id is duplicated"). Como el
      // order_id está atado al REQUEST, esto es prueba definitiva de que la solicitud
      // YA fue pagada — aunque nuestra base todavía la tenga 'pending' porque el webhook
      // o el retorno de éxito no llegaron (ej. el usuario volvió a mano). Reconciliamos
      // el pago existente para reflejar el estado real y respondemos `alreadyPaid` para
      // que la UI lleve al usuario a la vista "Reservada" en vez de mostrar un error crudo.
      const isDuplicateOrder =
        typeof result?.message === 'string' && /duplicat/i.test(result.message);
      if (isDuplicateOrder) {
        const { data: existing } = await admin
          .from('payments')
          .select('dlocalgo_payment_id')
          .eq('request_id', requestId)
          // Filtro por proveedor OBLIGATORIO: sin él, un pago PayPal más reciente
          // del mismo request sería el "último" y le mandaríamos un order id de
          // PayPal a la API de dLocalGo.
          .eq('provider', 'dlocalgo')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.dlocalgo_payment_id) {
          await applyDlocalgoPaymentStatus(existing.dlocalgo_payment_id as string);
        }
        console.warn('create-payment: order_id duplicado en dLocalGo, request ya pagado', { requestId });
        return NextResponse.json(
          { error: 'Esta solicitud ya tiene una reserva pagada', alreadyPaid: true },
          { status: 409 },
        );
      }
      console.error('dlocalgo create-payment error:', result);
      return NextResponse.json({ error: result.message ?? 'Error creando pago' }, { status: 500 });
    }

    const { error: insertError } = await admin.from('payments').insert({
      user_id: user.id,
      // Explícito aunque la columna tenga DEFAULT 'dlocalgo': que el medio de cobro
      // se lea en el código y no dependa de un default de esquema.
      provider: 'dlocalgo',
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
