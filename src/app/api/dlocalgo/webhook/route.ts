import { applyDlocalgoPaymentStatus } from '@/lib/dlocalgo-verify';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  // Log del body crudo: confirma qué campo manda dLocalGo y traza el flujo.
  console.log('📩 webhook recibido:', JSON.stringify(body));
  const { payment_id } = body;
  if (!payment_id) return NextResponse.json({ error: 'missing payment_id' }, { status: 400 });

  // El webhook no está firmado: la fuente de verdad es re-consultar el pago a la API.
  // Misma lógica idempotente que usa el retorno de éxito del cliente.
  const result = await applyDlocalgoPaymentStatus(payment_id);
  if (result.error) {
    // 5xx para que dLocalGo reintente — no pisa el registro con basura.
    console.error('[dlocalgo webhook] verificación falló:', payment_id, result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  console.log('🔎 webhook: aplicado', result.status, '| payment_id', payment_id);
  return NextResponse.json({ received: true });
}
