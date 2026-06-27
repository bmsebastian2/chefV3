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

  // Ruteo por rol — cada rol se maneja EXPLÍCITAMENTE y los desconocidos/null van
  // a la landing, para no rebotar en loop infinito con dashboard (rol null o uno
  // inesperado). El ?home=1 evita que el middleware vuelva a redirigir desde "/".
  const role = userData?.role
  if (role === 'admin') redirect('/admin')
  if (role === 'chef')  redirect('/dashboard')
  if (role !== 'client') redirect('/?home=1')

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
