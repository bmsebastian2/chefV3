export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { applyDlocalgoPaymentStatus } from '@/lib/dlocalgo-verify'
import { PaymentView } from './PaymentView'

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string; proposalId: string }>
  searchParams: Promise<{ guests?: string }>
}) {
  const { id: requestId, proposalId } = await params
  const { guests: guestsParam } = await searchParams

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
    .select('id, price_per_person, status')
    .eq('id', proposalId)
    .eq('request_id', requestId)
    .single()
  if (!proposal || proposal.status !== 'pending') {
    redirect(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  }

  const admin = createAdminClient()

  // Cerrar de raíz la ventana de confusión: si existe un pago 'pending' para este
  // request (ej. el usuario pagó y volvió a mano antes de que llegara el webhook /
  // el retorno de éxito), reconciliamos su estado real con dLocalGo ANTES de decidir
  // si mostramos el formulario. Si ya estaba pagado, el chequeo de abajo lo detecta y
  // redirige a "Reservada" — así el botón "Pagar" nunca aparece habilitado de más.
  const { data: pendingPayment } = await admin
    .from('payments')
    .select('dlocalgo_payment_id')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (pendingPayment?.dlocalgo_payment_id) {
    await applyDlocalgoPaymentStatus(pendingPayment.dlocalgo_payment_id as string)
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

  const guestsRaw = guestsParam ? parseInt(guestsParam, 10) : 2
  const guests = Number.isFinite(guestsRaw) && guestsRaw > 0 ? guestsRaw : 2
  const pricePerPerson = (proposal.price_per_person as number) ?? 0
  const total = pricePerPerson * guests

  return (
    <PaymentView
      requestId={requestId}
      proposalId={proposalId}
      total={total}
      guests={guests}
    />
  )
}
