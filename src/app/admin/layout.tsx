import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { IdleLogout } from './IdleLogout'
import { AdminLogoutButton } from './AdminLogoutButton'

export default async function AdminLayout({
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

  if (userData?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Cierre de sesión por inactividad (30 min) — solo en el panel admin */}
      <IdleLogout timeoutMs={30 * 60 * 1000} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="font-serif text-base font-semibold text-zinc-900">
            GetChef <span className="text-zinc-400 font-sans text-xs font-normal">· Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/?home=1"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
