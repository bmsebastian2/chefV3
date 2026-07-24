// ============================================================================
// Embudo anti-duplicados COMPARTIDO por todos los medios de cobro.
//
// Estos chequeos vivían inline en /api/dlocalgo/create-payment. Se extraen acá
// sin cambiar su comportamiento para que dLocalGo y PayPal pasen por el MISMO
// candado: un request ya pagado por tarjeta rechaza un pago PayPal y viceversa.
//
// Ninguno de los guards filtra por `payments.provider` A PROPÓSITO. El medio de
// cobro es irrelevante para la pregunta que responden: "¿esta solicitud ya tiene
// una reserva pagada?".
//
// Capas de defensa, de afuera hacia adentro:
//   1. la UI oculta el botón            (cosmético)
//   2. ESTE MÓDULO                      (la puerta)
//   3. create_booking_for_payment()     (chequeo 2b, en la transacción)
//   4. índice bookings_one_active_per_request  (la red final, imposible de burlar)
// ============================================================================

import type { createClient } from '@/utils/supabase/server';
import type { createAdminClient } from '@/utils/supabase/admin';
import type { MenuPrices } from '@/lib/pricing';

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient  = ReturnType<typeof createAdminClient>;

export type PayableOk = {
  ok:             true;
  /** Precio autoritativo leído de la propuesta. El caller calcula el total con él. */
  pricePerPerson: number;
  /**
   * Snapshot de precios por bracket del menú (proposals.price_2/3_6/7_20).
   * El caller re-precia con repriceProposal() según los comensales elegidos.
   * null en propuestas históricas o sin menú → el precio queda fijo.
   */
  snapshot: MenuPrices | null;
};

export type PayableRejected = {
  ok:     false;
  /** Status HTTP a devolver tal cual (403 / 400 / 409). */
  status: number;
  error:  string;
};

export type PayableResult = PayableOk | PayableRejected;

/**
 * Única puerta de entrada a un cobro. Verifica, en orden:
 *   0. que el request sea del usuario logueado
 *   1. que la propuesta exista y tenga precio válido
 *   2. que la propuesta siga 'pending'
 *   3. que no haya un pago completado para esta PROPUESTA
 *   4. que no haya un pago completado para este REQUEST  ← check principal
 *   5. que no haya un booking activo para este REQUEST   ← respaldo
 *
 * Pensada para llamarse DOS VECES en el flujo PayPal: al crear la orden y otra
 * vez justo antes de capturar. Esa segunda pasada no es paranoia — la ventana en
 * que el usuario está aprobando en paypal.com es exactamente donde puede
 * completarse un pago competidor del mismo request, y PayPal (a diferencia de
 * dLocalGo, que rechaza order_id duplicados) no nos da ninguna red propia ahí.
 *
 * Es idempotente y de solo lectura: llamarla de más no tiene efectos.
 */
export async function assertRequestPayable({
  supabase,
  admin,
  userId,
  requestId,
  proposalId,
  label = 'payment',
}: {
  supabase:   ServerClient;
  admin:      AdminClient;
  userId:     string;
  requestId:  string;
  proposalId: string;
  /** Prefijo de log, para distinguir el origen en los logs de Vercel. */
  label?:     string;
}): Promise<PayableResult> {

  // ── 0 · El request es del usuario ──────────────────────────────────────────
  const { data: request } = await supabase
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .eq('user_id', userId)
    .single();
  if (!request) {
    return { ok: false, status: 403, error: 'Solicitud no encontrada' };
  }

  // ── 1 · Monto AUTORITATIVO: precio de la propuesta, nunca un total del cliente ──
  // Si se confiara en el cliente, podría pagar $1 por un servicio de $378.
  const { data: proposal } = await supabase
    .from('proposals')
    .select('price_per_person, status, price_2, price_3_6, price_7_20')
    .eq('id', proposalId)
    .eq('request_id', requestId)
    .single();

  const pricePerPerson = Number(proposal?.price_per_person);
  if (!proposal || !Number.isFinite(pricePerPerson) || pricePerPerson <= 0) {
    console.error(`🛑 ${label}: propuesta sin precio válido`, { proposalId, pricePerPerson });
    return { ok: false, status: 400, error: 'Propuesta sin precio válido' };
  }

  // ── 2 · Propuesta ya no disponible (ej. ya 'accepted') ─────────────────────
  if (proposal.status !== 'pending') {
    console.warn(`${label}: rechazado, propuesta no-pending`, { proposalId, status: proposal.status });
    return { ok: false, status: 409, error: 'La propuesta ya no está disponible para pago' };
  }

  // ── 3 · Pago completado para esta propuesta ────────────────────────────────
  // Cubre la ventana entre que el pago se completa y que el webhook marque la
  // propuesta como accepted.
  const { data: paidProposal } = await admin
    .from('payments')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();
  if (paidProposal) {
    console.warn(`${label}: rechazado, ya existe un payment completado`, { proposalId });
    return { ok: false, status: 409, error: 'Esta propuesta ya fue pagada' };
  }

  // ── 4 · Pago completado para este REQUEST — CHECK PRINCIPAL ────────────────
  // Si la solicitud ya tiene CUALQUIER pago 'completed' (de esta o de OTRA
  // propuesta, por cualquier medio), no se permite otro cobro.
  // `payments.status='completed'` es la señal CONFIABLE: se setea al confirmar el
  // cobro, exista o no el booking. Mirar `bookings` NO alcanza (bug confirmado con
  // datos: 2 pagos completed para un request con 0/1 bookings → el guard que miraba
  // bookings quedaba ciego porque el booking no se crea / llega tarde).
  const { data: paidRequest } = await admin
    .from('payments')
    .select('id')
    .eq('request_id', requestId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();
  if (paidRequest) {
    console.warn(`${label}: rechazado, el request ya tiene un pago completado`, { requestId });
    return { ok: false, status: 409, error: 'Esta solicitud ya tiene una reserva pagada' };
  }

  // ── 5 · Booking activo (red secundaria; el índice DB es la red final) ──────
  const { data: activeBooking } = await admin
    .from('bookings')
    .select('id')
    .eq('request_id', requestId)
    .neq('booking_status', 'cancelled')
    .limit(1)
    .maybeSingle();
  if (activeBooking) {
    console.warn(`${label}: rechazado, el request ya tiene reserva activa`, { requestId });
    return { ok: false, status: 409, error: 'Esta solicitud ya tiene una reserva activa' };
  }

  // Snapshot solo si al menos un bracket tiene precio; si no, null explícito
  // (propuesta histórica / sin menú) → el caller no re-precia.
  const hasSnapshot =
    proposal.price_2 != null || proposal.price_3_6 != null || proposal.price_7_20 != null;
  const snapshot = hasSnapshot
    ? {
        price_2:    proposal.price_2    as number | null,
        price_3_6:  proposal.price_3_6  as number | null,
        price_7_20: proposal.price_7_20 as number | null,
      }
    : null;

  return { ok: true, pricePerPerson, snapshot };
}

/**
 * Total autoritativo. Trivial, pero centralizado para que ningún medio de cobro
 * invente su propia fórmula y los montos se desincronicen entre proveedores.
 */
export function computeTotal(pricePerPerson: number, guests: number): number | null {
  const total = pricePerPerson * guests;
  return Number.isFinite(total) && total > 0 ? total : null;
}

/**
 * Base URL para URLs de retorno y de webhook.
 *
 * Si esto queda en localhost, el webhook NUNCA llega: la pasarela no puede
 * alcanzar tu máquina. Fallback a NEXT_PUBLIC_URL (seteada a prod) y strip del
 * "/" final para no generar "//api/...". Mismo patrón que client-emails.ts y
 * wizard/actions.ts.
 */
export function resolveAppUrl(label = 'payment'): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');

  if (appUrl.includes('localhost')) {
    console.warn(`⚠️ ${label}: appUrl apunta a localhost — webhook y URLs de retorno no funcionarán. Configurá NEXT_PUBLIC_APP_URL.`);
  }

  return appUrl;
}
