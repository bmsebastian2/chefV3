import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { paypalRequest, findApprovalUrl } from '@/lib/paypal';
import { applyPaypalOrderStatus, buildCustomId } from '@/lib/paypal-verify';
import { assertRequestPayable, computeTotal, resolveAppUrl } from '@/lib/payment-guards';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const LABEL = 'paypal/create-order';

type PaypalOrderResponse = {
  id?:      string;
  status?:  string;
  links?:   unknown;
  name?:    string;
  message?: string;
  details?: Array<{ issue?: string; description?: string }>;
};

/**
 * Paso 1 de 3 del cobro PayPal: crear la orden.
 *
 * OJO — diferencia conceptual con dLocalGo: crear la orden NO cobra nada, ni
 * siquiera después de que el usuario la aprueba. La plata se mueve recién en la
 * CAPTURA (/api/paypal/capture). Y el registro del pago lo hace el webhook.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // El cliente NO manda el monto: solo la propuesta, el request y los comensales.
    // El total lo calcula el servidor para no confiar en un valor manipulable.
    const { proposalId, requestId, guests } = await req.json();
    if (!proposalId || !requestId || !guests) {
      console.error(`🛑 ${LABEL}: parámetros faltantes`, { proposalId, requestId, guests });
      return NextResponse.json({
        error: 'Parámetros faltantes',
        missing: { proposalId: !proposalId, requestId: !requestId, guests: !guests },
      }, { status: 400 });
    }

    const guestsNumber = Number(guests);
    if (!Number.isInteger(guestsNumber) || guestsNumber <= 0) {
      console.error(`🛑 ${LABEL}: guests inválido`, { guests });
      return NextResponse.json({ error: 'Cantidad de comensales inválida' }, { status: 400 });
    }

    // ── Embudo anti-duplicados COMPARTIDO con dLocalGo ────────────────────────
    // Propiedad del request + propuesta pagable + sin pago completado + sin
    // booking activo, sin importar el medio de cobro.
    const admin = createAdminClient();
    const gate  = await assertRequestPayable({
      supabase, admin,
      userId: user.id, requestId, proposalId,
      label:  LABEL,
    });
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const currency = 'USD';
    const total    = computeTotal(gate.pricePerPerson, guestsNumber);
    if (total === null) {
      console.error(`🛑 ${LABEL}: monto calculado inválido`, {
        pricePerPerson: gate.pricePerPerson, guestsNumber,
      });
      return NextResponse.json({ error: 'Monto de pago inválido' }, { status: 400 });
    }

    const appUrl = resolveAppUrl(LABEL);

    // ── Crear la orden ────────────────────────────────────────────────────────
    const result = await paypalRequest<PaypalOrderResponse>(
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          // invoice_id ATADO AL REQUEST: es el equivalente PayPal del order_id de
          // dLocalGo. PayPal lo exige único entre cobros CAPTURADOS, así que actúa
          // como red anti doble-cobro del lado de la pasarela: un segundo intento
          // de capturar el mismo request falla con DUPLICATE_INVOICE_ID. Que un
          // intento abandonado no bloquee el reintento es exactamente lo que
          // queremos (solo bloquea si hubo captura exitosa).
          invoice_id: requestId,
          // Metadata para atribuir cobros huérfanos. Formato "a:b:c" y no JSON
          // porque PayPal corta el campo en 127 caracteres — ver paypal-verify.
          custom_id:  buildCustomId(user.id, proposalId, requestId),
          description: 'Reserva de chef privado - GetChef',
          amount: {
            currency_code: currency,
            // PayPal exige string con 2 decimales; un number acá es 400.
            value: total.toFixed(2),
          },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name:          'GetChef',
              locale:              'es-ES',
              landing_page:        'LOGIN',
              // Sin envío: es un servicio a domicilio coordinado aparte, no un
              // producto físico. Evita que PayPal pida y muestre una dirección.
              shipping_preference: 'NO_SHIPPING',
              // PAY_NOW: el botón final dice "Pagar ahora" en vez de "Continuar",
              // así el usuario entiende que ahí se cierra el cobro.
              user_action:         'PAY_NOW',
              return_url: `${appUrl}/api/paypal/capture?request=${requestId}&proposal=${proposalId}`,
              cancel_url: `${appUrl}/client-dashboard/${requestId}/proposals/${proposalId}/payment`,
            },
          },
        },
      },
      // Idempotencia del lado de PayPal. UUID nuevo por intento a propósito: cada
      // click de "Pagar" es una orden nueva y legítima (la anterior pudo quedar
      // abandonada). Lo que NO puede repetirse es la CAPTURA, y esa usa el order id.
      { requestId: randomUUID() },
    );

    const approvalUrl = result.ok ? findApprovalUrl(result.data.links) : null;

    if (!approvalUrl) {
      // DUPLICATE_INVOICE_ID = prueba del lado de PayPal de que este request YA fue
      // cobrado, aunque nuestra base todavía lo tenga 'pending' porque el webhook no
      // llegó. Mismo tratamiento que le damos al "Order id is duplicated" de dLocalGo:
      // reconciliamos el pago existente y mandamos al usuario a la vista "Reservada"
      // en vez de mostrarle un error crudo.
      const isDuplicateInvoice =
        result.data?.details?.some((d) => d.issue === 'DUPLICATE_INVOICE_ID') ?? false;

      if (isDuplicateInvoice) {
        const { data: existing } = await admin
          .from('payments')
          .select('dlocalgo_payment_id')
          .eq('request_id', requestId)
          .eq('provider', 'paypal')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing?.dlocalgo_payment_id) {
          await applyPaypalOrderStatus(existing.dlocalgo_payment_id as string);
        }
        console.warn(`${LABEL}: invoice_id duplicado en PayPal, request ya pagado`, { requestId });
        return NextResponse.json(
          { error: 'Esta solicitud ya tiene una reserva pagada', alreadyPaid: true },
          { status: 409 },
        );
      }

      console.error(`🛑 ${LABEL}: PayPal no devolvió link de aprobación`, result.data);
      return NextResponse.json(
        { error: result.data?.message ?? 'Error creando la orden de pago' },
        { status: 500 },
      );
    }

    const orderId = result.data.id;
    if (!orderId) {
      console.error(`🛑 ${LABEL}: orden sin id`, result.data);
      return NextResponse.json({ error: 'Error creando la orden de pago' }, { status: 500 });
    }

    // ── Registrar el intento ANTES de mandar al usuario a PayPal ──────────────
    // Si esta fila no existe, el webhook no tiene qué actualizar (cae al camino de
    // reconciliación por custom_id, que funciona pero es el plan B). Por eso el
    // error NO se traga en silencio: fue la causa raíz del "pago infinito" en
    // dLocalGo.
    const { error: insertError } = await admin.from('payments').insert({
      user_id:             user.id,
      provider:            'paypal',
      // El ORDER id va en esta columna de nombre histórico. El capture id se
      // completa en provider_capture_id cuando el cobro se confirma.
      dlocalgo_payment_id: orderId,
      proposal_id:         proposalId,
      request_id:          requestId,
      amount:              total,
      currency,
      status:              'pending',
    });

    if (insertError) {
      console.error(`🛑 ${LABEL}: fallo al insertar en 'payments'`, {
        message: insertError.message,
        code:    insertError.code,
        details: insertError.details,
        hint:    insertError.hint,
      });
    }

    return NextResponse.json({ redirect_url: approvalUrl });
  } catch (err) {
    console.error(`${LABEL} unhandled error:`, err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
