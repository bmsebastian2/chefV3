import { NextResponse } from 'next/server';
import { paypalRequest, paypalEnv } from '@/lib/paypal';
import { applyPaypalOrderStatus, logPaypalRefund } from '@/lib/paypal-verify';

const LABEL = 'paypal/webhook';

/**
 * Paso 3 de 3: ÚNICA FUENTE DE VERDAD del registro del pago.
 *
 * A diferencia de dLocalGo (que no firma sus webhooks, por eso allá la defensa es
 * re-consultar la API), PayPal SÍ firma. Verificamos la firma de todo evento
 * entrante y rechazamos el que no verifique — también en sandbox. Un webhook sin
 * verificar es un endpoint público que cualquiera puede usar para marcar pagos
 * como cobrados.
 *
 * Verificada la firma, IGUAL re-consultamos la orden a PayPal antes de escribir
 * nada (applyPaypalOrderStatus). Cinturón y tiradores: la firma prueba el origen,
 * la re-consulta prueba el estado.
 */

type WebhookEvent = {
  id?:          string;
  event_type?:  string;
  resource?: {
    id?:     string;
    amount?: { value?: string; currency_code?: string };
    supplementary_data?: { related_ids?: { order_id?: string; capture_id?: string } };
    links?:  Array<{ rel?: string; href?: string }>;
  };
};

/**
 * El cert lo baja PayPal, no nosotros — pero la URL viaja en un header que
 * controla quien llame al endpoint. Si no la validáramos, un atacante podría
 * apuntarla a un host propio. Solo dominios de PayPal.
 */
function isPaypalCertUrl(certUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(certUrl);
    return protocol === 'https:' &&
      (hostname === 'paypal.com' || hostname.endsWith('.paypal.com'));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Body CRUDO, no req.json(): la verificación necesita los bytes exactos.
  const rawBody = await req.text();

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // Sin webhook id no hay verificación posible. Se rechaza en vez de degradar a
    // "confiar por defecto": una env faltante no puede abrir el endpoint.
    console.error(`🛑 ${LABEL}: falta PAYPAL_WEBHOOK_ID (entorno: ${paypalEnv}) — evento rechazado`);
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
  }

  const h = req.headers;
  const transmissionId   = h.get('paypal-transmission-id');
  const transmissionTime = h.get('paypal-transmission-time');
  const transmissionSig  = h.get('paypal-transmission-sig');
  const certUrl          = h.get('paypal-cert-url');
  const authAlgo         = h.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    console.error(`🛑 ${LABEL}: faltan cabeceras de firma — evento rechazado`);
    return NextResponse.json({ error: 'missing signature headers' }, { status: 401 });
  }

  if (!isPaypalCertUrl(certUrl)) {
    console.error(`🛑 ${LABEL}: cert_url no es de PayPal — evento rechazado`, { certUrl });
    return NextResponse.json({ error: 'invalid cert url' }, { status: 401 });
  }

  // ── Verificación de firma ────────────────────────────────────────────────────
  // El payload se arma por concatenación para insertar el body TAL CUAL llegó.
  // JSON.parse + re-stringify puede alterar orden de claves o formato de números
  // y hacer fallar la verificación de eventos perfectamente legítimos.
  const verifyPayload =
    '{' +
    `"auth_algo":${JSON.stringify(authAlgo)},` +
    `"cert_url":${JSON.stringify(certUrl)},` +
    `"transmission_id":${JSON.stringify(transmissionId)},` +
    `"transmission_sig":${JSON.stringify(transmissionSig)},` +
    `"transmission_time":${JSON.stringify(transmissionTime)},` +
    `"webhook_id":${JSON.stringify(webhookId)},` +
    `"webhook_event":${rawBody}` +
    '}';

  const verification = await paypalRequest<{ verification_status?: string }>(
    '/v1/notifications/verify-webhook-signature',
    verifyPayload,
  );

  if (!verification.ok || verification.data?.verification_status !== 'SUCCESS') {
    console.error(`🛑 ${LABEL}: FIRMA INVÁLIDA — evento rechazado`, {
      status:              verification.status,
      verification_status: verification.data?.verification_status,
      transmissionId,
    });
    // 401 y no 5xx: no queremos que PayPal reintente algo que no verifica.
    return NextResponse.json({ error: 'signature verification failed' }, { status: 401 });
  }

  // ── Recién acá el evento es confiable ───────────────────────────────────────
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    console.error(`🛑 ${LABEL}: body no es JSON válido pese a verificar`);
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const eventType = event.event_type ?? '(sin tipo)';
  console.log(`📩 ${LABEL}: evento verificado`, { id: event.id, type: eventType });

  switch (eventType) {
    // ── Cobro confirmado / rechazado ─────────────────────────────────────────
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'PAYMENT.CAPTURE.DENIED': {
      // El recurso del evento es la CAPTURA; nosotros indexamos por ORDER id.
      // PayPal lo expone en supplementary_data.related_ids.
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      if (!orderId) {
        console.error(`🛑 ${LABEL}: evento de captura sin order_id`, {
          id: event.id, captureId: event.resource?.id,
        });
        return NextResponse.json({ error: 'missing order_id' }, { status: 400 });
      }

      // Nunca se escribe desde el body del evento: se re-consulta la orden.
      const result = await applyPaypalOrderStatus(orderId);
      if (result.error) {
        // 5xx para que PayPal reintente — no pisa el registro con basura.
        console.error(`🛑 ${LABEL}: verificación falló`, { orderId, error: result.error });
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      console.log(`🔎 ${LABEL}: aplicado`, { orderId, status: result.status, paid: result.paid });
      return NextResponse.json({ received: true });
    }

    // ── Reembolsos ───────────────────────────────────────────────────────────
    // Solo deja traza: el cierre de refund_status lo hace el admin desde el panel,
    // que exige refund_ref y audita quién lo ejecutó (ver paypal-verify).
    case 'PAYMENT.CAPTURE.REFUNDED':
    case 'PAYMENT.CAPTURE.REVERSED': {
      await logPaypalRefund({
        refundId:  event.resource?.id,
        captureId: event.resource?.supplementary_data?.related_ids?.capture_id,
        amount:    event.resource?.amount?.value,
        currency:  event.resource?.amount?.currency_code,
      });
      return NextResponse.json({ received: true });
    }

    default:
      // 200 a lo no manejado: si devolviéramos error, PayPal reintentaría durante
      // días un evento que decidimos ignorar.
      console.log(`${LABEL}: evento ignorado`, { type: eventType });
      return NextResponse.json({ received: true, ignored: true });
  }
}
