export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RequestsView } from '@/components/dashboard/RequestsView'
import type { RequestCard, MissingRequirement, ChefMenu, ChefBooking } from '@/components/dashboard/RequestsView'

type ChefRequestsState = {
  can_receive: boolean
  blocked?: boolean
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

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const proposalMap: Record<string, string> = {}
  const chefMenus: ChefMenu[] = []
  let cancelledApplied: RequestCard[] = []
  let bookings: ChefBooking[] = []

  if (chef) {
    // Reservas confirmadas/completadas: independiente de state.requests (que solo
    // trae status='new') y de can_receive — una vez ganado el trabajo, el chef
    // debe seguir viéndolo aunque después deje de cumplir los mínimos de perfil.
    const { data: bookingsData } = await supabase.rpc('get_chef_bookings')
    if (Array.isArray(bookingsData)) {
      bookings = bookingsData as ChefBooking[]
    }

    const { data: proposals } = await supabase
      .from('proposals')
      .select('request_id, status')
      .eq('chef_id', chef.id)

    for (const p of proposals ?? []) {
      proposalMap[p.request_id] = p.status
    }

    const { data: cancelledData } = await supabase.rpc('get_cancelled_applied_requests')
    if (Array.isArray(cancelledData)) {
      cancelledApplied = (cancelledData as RequestCard[]).map((r) => ({
        ...r,
        proposal_status: proposalMap[r.id] ?? null,
      }))
    }

    if (state.can_receive) {
      const { data: menus } = await supabase
        .from('chef_menus')
        .select('id, title, price_2, price_3_6, price_7_20')
        .eq('chef_id', chef.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const menuIds = (menus ?? []).map((m) => m.id as string)

      const [{ data: courseRows }, { data: dishRows }] = await Promise.all([
        supabase
          .from('menu_course_settings')
          .select('menu_id, course, selection_mode')
          .in('menu_id', menuIds.length ? menuIds : ['']),
        supabase
          .from('menu_dishes')
          .select('menu_id, dish_id, dishes(name, course)')
          .in('menu_id', menuIds.length ? menuIds : ['']),
      ])

      for (const m of menus ?? []) {
        const id = m.id as string
        const courses = (courseRows ?? [])
          .filter((r) => r.menu_id === id)
          .map((r) => ({ course: r.course as string, selection_mode: r.selection_mode as string }))

        const dishes = (dishRows ?? [])
          .filter((r) => r.menu_id === id)
          .flatMap((r) => {
            const d = r.dishes
            if (Array.isArray(d)) return d as { name: string; course: string }[]
            if (d && typeof d === 'object' && d !== null) return [d as { name: string; course: string }]
            return []
          })

        chefMenus.push({
          id,
          title:      m.title as string,
          courses,
          dishes,
          price_2:    (m.price_2    as number | null) ?? null,
          price_3_6:  (m.price_3_6  as number | null) ?? null,
          price_7_20: (m.price_7_20 as number | null) ?? null,
        })
      }
    }
  }

  const existingIds = new Set(state.requests.map((r) => r.id))
  const requests = [
    ...state.requests.map((r) => ({
      ...r,
      proposal_status: proposalMap[r.id] ?? null,
    })),
    ...cancelledApplied.filter((r) => !existingIds.has(r.id)),
  ]

  return (
    <RequestsView
      canReceive={state.can_receive}
      missing={state.missing}
      requests={requests}
      chefMenus={chefMenus}
      blocked={state.blocked ?? false}
      bookings={bookings}
    />
  )
}
