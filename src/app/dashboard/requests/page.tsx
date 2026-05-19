export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RequestsView } from '@/components/dashboard/RequestsView'
import type { RequestCard, MissingRequirement } from '@/components/dashboard/RequestsView'

type ChefRequestsState = {
  can_receive: boolean
  missing: MissingRequirement[]
  requests: RequestCard[]
} | null

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data } = await supabase.rpc('get_chef_requests_state')
  const state = data as ChefRequestsState
  if (!state) redirect('/dashboard')

  return (
    <RequestsView
      canReceive={state.can_receive}
      missing={state.missing}
      requests={state.requests}
    />
  )
}
