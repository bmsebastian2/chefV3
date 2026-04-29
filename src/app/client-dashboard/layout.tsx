import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

  // Solo clientes pueden acceder al dashboard de cliente
  if (userData?.role !== 'client') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
    </div>
  )
}
