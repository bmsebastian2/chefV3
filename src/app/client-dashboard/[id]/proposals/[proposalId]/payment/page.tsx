export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { applyDlocalgoPaymentStatus } from '@/lib/dlocalgo-verify'
import { applyPaypalOrderStatus } from '@/lib/paypal-verify'
import { repriceProposal, MIN_BOOKING_GUESTS } from '@/lib/pricing'
import { MAX_EVENT_GUESTS } from '@/components/wizard/types'
import { PaymentView } from './PaymentView'

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string; proposalId: string }>
  searchParams: Promise<{ guests?: string; error?: string }>
}) {
  const { id: requestId, proposalId } = await params
  const { guests: guestsParam, error: errorParam } = await searchParams

  // Retorno fallido de la pasarela (PayPal). La ruta de captura redirige acá con
  // ?error=... cuando el cobro no se concretó. Se traduce a un mensaje para el
  // usuario; códigos desconocidos caen a uno genérico (nunca se muestra el código
  // crudo). El pago no se movió en ninguno de estos casos.
  const ERROR_MESSAGES: Record<string, string> = {
    declined:      'Tu tarjeta fue rechazada. Probá con otro método de pago.',
    capture_failed: 'No se pudo completar el pago. No se realizó ningún cobro; intentá de nuevo.',
  }
  const initialError = errorParam
    ? (ERROR_MESSAGES[errorParam] ?? 'No se pudo completar el pago. Intentá de nuevo.')
    : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: request } = await supabase
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!request) notFound()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, price_per_person, status, price_2, price_3_6, price_7_20')
    .eq('id', proposalId)
    .eq('request_id', requestId)
    .single()
  if (!proposal || proposal.status !== 'pending') {
    redirect(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  }

  const admin = createAdminClient()

  // Cerrar de raíz la ventana de confusión: si existe un pago 'pending' para este
  // request (ej. el usuario pagó y volvió a mano antes de que llegara el webhook /
  // el retorno de éxito), reconciliamos su estado real con la pasarela ANTES de decidir
  // si mostramos el formulario. Si ya estaba pagado, el chequeo de abajo lo detecta y
  // redirige a "Reservada" — así el botón "Pagar" nunca aparece habilitado de más.
  //
  // Se ramifica por `provider` porque esta reconciliación es la que sostiene el
  // chequeo de doble-pago de más abajo: si un pago PayPal 'pending' pero ya capturado
  // no se reconcilia (id de PayPal enviado a la API de dLocalGo → lookup fallido),
  // el formulario se muestra igual y el usuario puede arrancar un segundo cobro.
  const { data: pendingPayment } = await admin
    .from('payments')
    .select('dlocalgo_payment_id, provider')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (pendingPayment?.dlocalgo_payment_id) {
    const providerRef = pendingPayment.dlocalgo_payment_id as string
    if (pendingPayment.provider === 'paypal') {
      await applyPaypalOrderStatus(providerRef)
    } else {
      await applyDlocalgoPaymentStatus(providerRef)
    }
  }

  // Doble-pago: si la solicitud ya tiene un pago 'completed' (de esta o de otra
  // propuesta), no se puede iniciar otro → fuera del flujo, antes de la pasarela.
  // Señal confiable = payments.completed (NO bookings, que puede no crearse).
  const { data: paidRequest } = await admin
    .from('payments')
    .select('id')
    .eq('request_id', requestId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle()
  if (paidRequest) {
    redirect(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  }

  // Comensales elegidos en la reserva (query param), clampeados a los límites
  // del stepper para que un param manipulado no muestre un total fuera de rango.
  const guestsRaw = guestsParam ? parseInt(guestsParam, 10) : MIN_BOOKING_GUESTS
  const guests = Number.isFinite(guestsRaw)
    ? Math.min(MAX_EVENT_GUESTS, Math.max(MIN_BOOKING_GUESTS, guestsRaw))
    : MIN_BOOKING_GUESTS

  // Mismo re-precio que BookingView y que las rutas de cobro: precio real del
  // chef para el bracket elegido (snapshot del menú en la propuesta); sin
  // snapshot el precio queda fijo.
  const hasSnapshot =
    proposal.price_2 != null || proposal.price_3_6 != null || proposal.price_7_20 != null
  const snapshot = hasSnapshot
    ? {
        price_2:    proposal.price_2    as number | null,
        price_3_6:  proposal.price_3_6  as number | null,
        price_7_20: proposal.price_7_20 as number | null,
      }
    : null

  const pricePerPerson =
    repriceProposal((proposal.price_per_person as number) ?? 0, snapshot, guests)
      ?? (proposal.price_per_person as number) ?? 0
  const total = pricePerPerson * guests

  return (
    <PaymentView
      requestId={requestId}
      proposalId={proposalId}
      total={total}
      guests={guests}
      initialError={initialError}
    />
  )
}
