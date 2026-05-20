import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { ClipboardList, Plus, LogOut } from 'lucide-react'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Activar requests pendientes si el email ya fue confirmado.
  // Corre cada vez que el usuario visita el dashboard — es idempotente.
  if (user.email_confirmed_at) {
    const admin = createAdminClient()
    const { data: activated, error } = await admin
      .rpc('activate_pending_requests', { p_user_id: user.id })

    console.log('[dashboard] activate_pending_requests:', JSON.stringify(activated), 'err:', error?.message)

    if (error) {
      console.error('[dashboard] activate pending requests:', error.message)
    } else if (activated && (activated as (string | { id: string })[]).length > 0) {
      // El RPC puede devolver strings (UUID directo) u objetos con .id según el schema cache
      const validIds = (activated as (string | { id: string })[])
        .map((r) => (typeof r === 'string' ? r : r.id))
        .filter(Boolean) as string[]
      console.log('[dashboard] validIds a notificar:', validIds)
      if (validIds.length > 0) {
        after(async () => {
          for (const requestId of validIds) {
            await notifyMatchingChefs(requestId)
              .catch((err) => console.error('[dashboard] notifyMatchingChefs:', err))
          }
        })
      }
    }
  }

  const [{ data: userData }, { data: requests }] = await Promise.all([
    supabase.from('users').select('first_name, first_surname, phone').eq('id', user.id).single(),
    supabase.from('service_requests')
      .select('id, service_type, status, event_date_start, location, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const name = [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ') || user.email

  const wizardUrl = (() => {
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (user.email) params.set('email', user.email)
    if (userData?.phone) params.set('phone', userData.phone)
    return `/wizard?${params.toString()}`
  })()

  const STATUS_LABELS: Record<string, string> = {
    new:                  'Nueva',
    active:               'Activa',
    pending_confirmation: 'Pendiente de confirmación',
    in_process:           'En proceso',
    paid:                 'Pagada',
    completed:            'Completada',
    cancelled:            'Cancelada',
    pending:              'Pendiente',
  }

  const STATUS_COLORS: Record<string, string> = {
    new:                  'bg-blue-50 text-blue-700',
    active:               'bg-emerald-50 text-emerald-700',
    pending_confirmation: 'bg-amber-50 text-amber-700',
    in_process:           'bg-amber-50 text-amber-700',
    paid:                 'bg-emerald-50 text-emerald-700',
    completed:            'bg-zinc-100 text-zinc-600',
    cancelled:            'bg-red-50 text-red-700',
    pending:              'bg-amber-50 text-amber-700',
  }

  const SERVICE_LABELS: Record<string, string> = {
    single:   'Servicio único',
    multiple: 'Múltiples servicios',
    weekly:   'Semanal',
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-bold text-zinc-900">
          GetChef.com
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500 hidden sm:block">{name}</span>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-zinc-900">
            Hola, {userData?.first_name || 'bienvenido/a'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aquí podés ver y gestionar tus solicitudes de chef.
          </p>
        </div>

        {/* CTA nueva solicitud */}
        <Link
          href={wizardUrl}
          className="flex items-center gap-3 w-full bg-accent hover:bg-accent/90 text-white font-medium text-sm px-5 py-4 rounded-xl transition-colors mb-8"
        >
          <Plus className="w-5 h-5" />
          Nueva solicitud de chef
        </Link>

        {/* Solicitudes */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
            Mis solicitudes
          </h2>

          {!requests || requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
              <p className="text-sm text-zinc-500">Todavía no tenés solicitudes.</p>
              <p className="text-xs text-zinc-400 mt-1">
                Hacé tu primera solicitud y recibí propuestas de chefs en minutos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {SERVICE_LABELS[req.service_type] ?? req.service_type}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {req.event_date_start
                        ? new Date(req.event_date_start + 'T00:00:00').toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                      {req.location ? ` · ${req.location}` : ''}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
