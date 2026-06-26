export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

  // Doble-reserva: si la solicitud ya tiene un booking ACTIVO (de esta o de otra
  // propuesta), no se puede iniciar otro pago → fuera del flujo. (Defensa de UX;
  // el backend y el índice son la protección real.)
  const admin = createAdminClient()
  const { data: activeBooking } = await admin
    .from('bookings')
    .select('id')
    .eq('request_id', requestId)
    .neq('booking_status', 'cancelled')
    .limit(1)
    .maybeSingle()
  if (activeBooking) {
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
