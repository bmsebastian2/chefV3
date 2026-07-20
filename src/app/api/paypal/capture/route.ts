import { NextResponse } from 'next/server';
import { paypalRequest } from '@/lib/paypal';
import { assertRequestPayable, resolveAppUrl } from '@/lib/payment-guards';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const LABEL = 'paypal/capture';

type CaptureResponse = {
  id?:      string;
  status?:  string;
  message?: string;
  details?: Array<{ issue?: string; description?: string }>;
};

/**
 * Paso 2 de 3: el usuario aprobó en paypal.com y PayPal lo devuelve acá por GET.
 *
 * Esta ruta EJECUTA LA CAPTURA (mueve la plata) pero NO registra el pago: el
 * registro es responsabilidad exclusiva del webhook PAYMENT.CAPTURE.COMPLETED.
 *
 * ¿Por qué la captura no puede vivir en el webhook? Porque en PayPal la captura
 * es una acción NUESTRA: si nadie la dispara, la plata nunca se mueve y el evento
 * PAYMENT.CAPTURE.COMPLETED no se emite jamás. El redirect es el disparador; el
 * webhook sigue siendo la única fuente de verdad del registro.
 *
 * De los query params NO se confía en nada salvo `token` (el order id que agrega
 * PayPal), y ese se usa solo para BUSCAR nuestra fila: request, proposal y dueño
 * salen de la base, no de la URL.
 */
export async function GET(req: Request) {
  const appUrl = resolveAppUrl(LABEL);
  const url    = new URL(req.url);
  const orderId = url.searchParams.get('token');

  // Fallback de redirect si ni siquiera podemos identificar la orden.
  const home = new URL('/client-dashboard', appUrl);

  try {
    if (!orderId) {
      console.error(`🛑 ${LABEL}: retorno sin token (order id)`);
      return NextResponse.redirect(home);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Sin sesión no capturamos. La orden queda aprobada pero sin capturar y
      // PayPal la anula sola: NO se pierde plata, el usuario reintenta logueado.
      console.warn(`${LABEL}: retorno sin sesión, no se captura`, { orderId });
      return NextResponse.redirect(new URL('/', appUrl));
    }

    const admin = createAdminClient();

    // ── Datos AUTORITATIVOS de la orden: de nuestra base, no de la URL ────────
    const { data: payment } = await admin
      .from('payments')
      .select('user_id, request_id, proposal_id, status')
      .eq('dlocalgo_payment_id', orderId)
      .maybeSingle();

    if (!payment) {
      // La orden existe en PayPal pero no en nuestra base (falló el insert de
      // create-order). No capturamos a ciegas: si el usuario ya aprobó, el webhook
      // no puede dispararse porque no hay captura, así que no hay cobro fantasma.
      console.error(`🛑 ${LABEL}: no hay fila en 'payments' para la orden`, { orderId });
      return NextResponse.redirect(home);
    }

    // El dueño del pago es quien puede capturarlo. Sin esto, cualquiera con el
    // token en la URL dispararía el cobro de otro.
    if (payment.user_id !== user.id) {
      console.error(`🛑 ${LABEL}: la orden no pertenece al usuario logueado`, {
        orderId, owner: payment.user_id, caller: user.id,
      });
      return NextResponse.redirect(home);
    }

    const requestId  = payment.request_id  as string;
    const proposalId = payment.proposal_id as string;

    const paymentPage  = new URL(`/client-dashboard/${requestId}/proposals/${proposalId}/payment`, appUrl);
    const proposalPage = new URL(`/client-dashboard/${requestId}/proposals/${proposalId}`, appUrl);

    // ── RE-CHEQUEO DEL EMBUDO, justo antes de mover la plata ──────────────────
    // Segunda pasada deliberada. La ventana en que el usuario estuvo aprobando en
    // paypal.com es exactamente donde puede haberse completado un pago competidor
    // del mismo request (otra propuesta, otro medio, otra pestaña). Capturar sin
    // re-chequear sería cobrar y después descubrir que hay que reembolsar.
    const gate = await assertRequestPayable({
      supabase, admin,
      userId: user.id, requestId, proposalId,
      label:  LABEL,
    });
    if (!gate.ok) {
      // No se captura → la plata nunca se movió → no hay nada que reembolsar.
      console.warn(`${LABEL}: captura abortada por el embudo`, { orderId, motivo: gate.error });
      proposalPage.searchParams.set('payment', 'duplicate');
      return NextResponse.redirect(proposalPage);
    }

    // ── Capturar ──────────────────────────────────────────────────────────────
    // PayPal-Request-Id = order id: idempotencia fuerte. Si este GET se repite
    // (doble click, prefetch, retry de red), PayPal devuelve la captura original
    // en vez de cobrar dos veces.
    const result = await paypalRequest<CaptureResponse>(
      `/v2/checkout/orders/${orderId}/capture`,
      undefined,
      { requestId: orderId },
    );

    const issues = result.data?.details?.map((d) => d.issue) ?? [];

    // Ya capturada = éxito, no error. Pasa con reintentos y con la carrera contra
    // el propio webhook.
    const alreadyCaptured = issues.includes('ORDER_ALREADY_CAPTURED');

    if (!result.ok && !alreadyCaptured) {
      // Medio de pago rechazado: es recuperable, el usuario elige otro en PayPal.
      const declined = issues.includes('INSTRUMENT_DECLINED');
      // invoice_id ya usado en una captura exitosa = este request YA fue cobrado.
      const duplicate = issues.includes('DUPLICATE_INVOICE_ID');

      console.error(`🛑 ${LABEL}: fallo la captura`, {
        orderId, status: result.status, issues, message: result.data?.message,
      });

      if (duplicate) {
        proposalPage.searchParams.set('payment', 'duplicate');
        return NextResponse.redirect(proposalPage);
      }
      paymentPage.searchParams.set('error', declined ? 'declined' : 'capture_failed');
      return NextResponse.redirect(paymentPage);
    }

    console.log(`✅ ${LABEL}: captura ejecutada`, {
      orderId, status: result.data?.status, alreadyCaptured,
    });

    // El estado del pago lo escribe el webhook. Acá solo llevamos al usuario a la
    // pantalla de confirmación; esa vista NO toma el query param como prueba de
    // pago (re-verifica contra la pasarela).
    proposalPage.searchParams.set('payment', 'success');
    return NextResponse.redirect(proposalPage);

  } catch (err) {
    console.error(`${LABEL} unhandled error:`, err);
    return NextResponse.redirect(home);
  }
}
