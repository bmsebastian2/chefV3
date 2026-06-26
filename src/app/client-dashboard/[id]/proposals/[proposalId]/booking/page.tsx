export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { BookingView } from './BookingView'

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>
}) {
  const { id: requestId, proposalId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: request } = await supabase
    .from('service_requests')
    .select('id, event_date_start, cuisine_type, cuantas_personas')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!request) notFound()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, chef_id, price_per_person, status')
    .eq('id', proposalId)
    .eq('request_id', requestId)
    .single()
  if (!proposal || proposal.status !== 'pending') {
    redirect(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  }

  const admin = createAdminClient()

  // Doble-reserva: si la solicitud ya tiene un booking ACTIVO (de esta o de otra
  // propuesta), no se puede iniciar otra reserva → fuera del flujo.
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

  const { data: chefProfile } = await supabase
    .from('chef_profiles')
    .select('id, user_id')
    .eq('id', proposal.chef_id as string)
    .single()

  const [{ data: chefUser }, { data: profilePhoto }] = await Promise.all([
    chefProfile
      ? admin
          .from('users')
          .select('first_name, first_surname')
          .eq('id', chefProfile.user_id as string)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('chef_photos')
      .select('url')
      .eq('chef_id', proposal.chef_id as string)
      .eq('type', 'profile')
      .maybeSingle(),
  ])

  const chefName = chefUser
    ? [chefUser.first_name, chefUser.first_surname].filter(Boolean).join(' ')
    : 'Chef'

  const dateStr = new Date((request.event_date_start as string) + 'T00:00:00').toLocaleDateString(
    'es-AR',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )

  return (
    <BookingView
      requestId={requestId}
      proposalId={proposalId}
      chef={{
        name:     chefName,
        photoUrl: (profilePhoto?.url as string | null) ?? null,
      }}
      menu={{
        cuisineType:    (request.cuisine_type as string | null) ?? null,
        pricePerPerson: (proposal.price_per_person as number) ?? 0,
        dateStr,
      }}
      maxGuests={(request.cuantas_personas as number | null) ?? 4}
    />
  )
}
