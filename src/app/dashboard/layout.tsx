import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { BlockedAccount } from '@/components/dashboard/BlockedAccount'
import type { ChefBooking } from '@/components/dashboard/RequestsView'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: userData }, { data: chefProfile }] = await Promise.all([
    supabase.from('users').select('first_name, first_surname, role').eq('id', user.id).single(),
    supabase.from('chef_profiles').select('id, admin_blocked, admin_block_reason').eq('user_id', user.id).single(),
  ])

  // Ruteo por rol — cada rol se maneja EXPLÍCITAMENTE y los desconocidos/null van
  // a la landing. Si no, dashboard ↔ client-dashboard se rebotan en loop infinito
  // (ej. un admin en un deploy sin /admin, o un role null). El ?home=1 evita que el
  // middleware vuelva a redirigir desde "/".
  const role = userData?.role
  if (role === 'admin')  redirect('/admin')
  if (role === 'client') redirect('/client-dashboard')
  if (role !== 'chef')   redirect('/?home=1')

  // Bloqueo administrativo: gate GLOBAL del dashboard. El chef puede loguearse
  // (a propósito, para enterarse y contactar al admin) pero queda contenido en la
  // pantalla de bloqueo, sin sidebar ni acceso a ninguna subpágina operativa. El
  // backend (get_chef_requests_state, submit_proposal, listados públicos) ya
  // enforza el bloqueo por su cuenta; esto corta la operativa también en la UI.
  if (chefProfile?.admin_blocked) {
    // Se lee server-side, CON la sesión todavía válida (el signOut de
    // BlockedAccount corre client-side, después del montaje) — para que un
    // chef bloqueado siga viendo, en solo lectura, los servicios que ya cobró
    // y todavía tiene que cumplir. El bloqueo no cancela nada por sí solo.
    const { data: bookingsData } = await supabase.rpc('get_chef_bookings')
    const confirmedBookings = (Array.isArray(bookingsData) ? bookingsData as ChefBooking[] : [])
      .filter((b) => b.booking_status === 'confirmed')

    return <BlockedAccount reason={chefProfile.admin_block_reason} bookings={confirmedBookings} />
  }

  let profilePhotoUrl: string | null = null
  if (chefProfile) {
    const { data: photoData } = await supabase
      .from('chef_photos')
      .select('url')
      .eq('chef_id', chefProfile.id)
      .eq('type', 'profile')
      .maybeSingle()
    profilePhotoUrl = photoData?.url ?? null
  }

  const userName = userData?.first_name || user.email || 'Chef'
  const userFullName = [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar userName={userName} userFullName={userFullName} profilePhotoUrl={profilePhotoUrl} />
      <div className="md:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
