export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { RequestChatView } from '@/components/dashboard/RequestChatView'

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  // Authorization gate: the chef must own a proposal on this request.
  // (RLS lets the chef read their own proposals.)
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, message, menu_description, price_per_person, status, created_at')
    .eq('request_id', id)
    .eq('chef_id', chef.id)
    .maybeSingle()

  if (!proposal) redirect('/dashboard/requests')

  // The chef does not own the service_request row, so RLS blocks a direct
  // read. Fetch it with the service-role client now that authorization is
  // established above.
  const admin = createAdminClient()

  const { data: request } = await admin
    .from('service_requests')
    .select('id, status, service_type, event_date_start, event_date_end, event_time, budget_min, budget_max, guests_adults, guests_teens, guests_kids, cuantas_personas, occasion, location, cuisine_type, user_id')
    .eq('id', id)
    .single()

  if (!request) notFound()

  // Fetch client name
  const { data: clientUser } = await admin
    .from('users')
    .select('first_name, first_surname')
    .eq('id', request.user_id ?? '')
    .maybeSingle()

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, sender_name, content, is_read, sent_at')
    .eq('proposal_id', proposal.id)
    .order('sent_at', { ascending: true })

  return (
    <RequestChatView
      proposalId={proposal.id as string}
      currentUserId={user.id}
      request={{
        status:           request.status as string,
        service_type:     request.service_type as string,
        event_date_start: request.event_date_start as string,
        event_date_end:   request.event_date_end as string | null,
        event_time:       request.event_time as string | null,
        budget_min:       request.budget_min as number | null,
        budget_max:       request.budget_max as number | null,
        guests_adults:    request.guests_adults as number | null,
        guests_teens:     request.guests_teens as number | null,
        guests_kids:      request.guests_kids as number | null,
        cuantas_personas: request.cuantas_personas as number | null,
        occasion:         request.occasion as string | null,
        location:         request.location as string | null,
        cuisine_type:     request.cuisine_type as string | null,
      }}
      clientName={[clientUser?.first_name, clientUser?.first_surname].filter(Boolean).join(' ') || 'Cliente'}
      proposal={{
        id:               proposal.id as string,
        message:          proposal.message as string | null,
        menu_description: proposal.menu_description as string | null,
        price_per_person: proposal.price_per_person as number | null,
        status:           proposal.status as string,
        created_at:       proposal.created_at as string,
      }}
      initialMessages={(messages ?? []).map((m: Record<string, unknown>) => ({
        id:          m.id as string,
        sender_id:   m.sender_id as string,
        sender_name: m.sender_name as string,
        content:     m.content as string,
        is_read:     m.is_read as boolean,
        sent_at:     m.sent_at as string,
      }))}
    />
  )
}
