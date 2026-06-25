import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ClientSidebar } from '@/components/client-dashboard/ClientSidebar'

export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Los admin van a su panel (evita el loop client-dashboard ↔ dashboard).
  if (userData?.role === 'admin') redirect('/admin')
  if (userData?.role !== 'client') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-zinc-50">
      <ClientSidebar />
      <div className="md:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
