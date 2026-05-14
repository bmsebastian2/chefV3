export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RequestsView } from '@/components/dashboard/RequestsView'
import type { RequestCard } from '@/components/dashboard/RequestsView'

interface RawRequest {
  id: string
  status: string
  service_type: string
  event_date_start: string | null
  event_date_end: string | null
  event_time: string | null
  budget_min: number | null
  budget_max: number | null
  cuantas_personas: number | null
  guests_adults: number | null
  guests_teens: number | null
  guests_kids: number | null
  occasion: string | null
  location: string | null
  city: string | null
  cuisine_type: string | null
  client_name: string | null
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const [{ data: settings }, { data: completion }] = await Promise.all([
    supabase
      .from('request_settings')
      .select('*')
      .eq('chef_id', chef.id)
      .single(),
    supabase
      .from('profile_completion')
      .select('account_done, bio_done, location_done, profile_picture_done')
      .eq('chef_id', chef.id)
      .single(),
  ])

  const { data: allRequests } = await supabase.rpc('get_requests_for_chef')

  let filtered: RawRequest[] = (allRequests ?? [] as RawRequest[]).filter(
    (r: RawRequest) => r.status === 'new' || r.status === 'active'
  )

  if (settings) {
    const s = {
      accepts_single:   settings.accepts_single,
      accepts_multiple: settings.accepts_multiple,
      accepts_weekly:   settings.accepts_weekly,
      min_guests:       settings.min_guests   ?? 1,
      max_guests:       settings.max_guests   ?? 50,
      min_budget:       settings.min_budget   ?? null,
      advance_days:     settings.advance_days ?? 0,
    }

    const acceptedTypes: string[] = []
    if (s.accepts_single)   acceptedTypes.push('single')
    if (s.accepts_multiple) acceptedTypes.push('multiple')
    if (s.accepts_weekly)   acceptedTypes.push('weekly')

    if (acceptedTypes.length === 0) {
      return <RequestsView requests={[]} profileComplete={false} />
    }

    filtered = filtered.filter((r) => acceptedTypes.includes(r.service_type))

    filtered = filtered.filter((r) =>
      r.cuantas_personas == null ||
      (r.cuantas_personas >= s.min_guests && r.cuantas_personas <= s.max_guests)
    )

    if (s.min_budget != null) {
      filtered = filtered.filter((r) =>
        r.budget_max == null || r.budget_max >= s.min_budget!
      )
    }

    if (s.advance_days > 0) {
      const minDate = new Date()
      minDate.setDate(minDate.getDate() + s.advance_days)
      const minDateStr = minDate.toISOString().split('T')[0]
      filtered = filtered.filter((r) =>
        r.event_date_start == null || r.event_date_start >= minDateStr
      )
    }
  }

  const requests: RequestCard[] = filtered.map((r) => ({
    id:               r.id,
    status:           r.status,
    service_type:     r.service_type,
    event_date_start: r.event_date_start ?? '',
    event_date_end:   r.event_date_end,
    event_time:       r.event_time,
    budget_min:       r.budget_min,
    budget_max:       r.budget_max,
    cuantas_personas: r.cuantas_personas,
    guests_adults:    r.guests_adults,
    guests_teens:     r.guests_teens,
    guests_kids:      r.guests_kids,
    occasion:         r.occasion,
    location:         r.location,
    city:             r.city,
    cuisine_type:     r.cuisine_type,
    client_name:      r.client_name ?? 'Cliente',
  }))

  const profileComplete =
    !!(completion?.account_done &&
       completion?.bio_done &&
       completion?.location_done &&
       completion?.profile_picture_done)

  return (
    <RequestsView
      requests={requests}
      profileComplete={profileComplete}
    />
  )
}
