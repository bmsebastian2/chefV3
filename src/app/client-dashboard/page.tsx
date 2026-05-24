import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { ClipboardList, Plus, LogOut } from 'lucide-react'
import { CancelButton } from './CancelButtonClient'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  if (user.email_confirmed_at) {
    const admin = createAdminClient()
    const { data: activated, error } = await admin
      .rpc('activate_pending_requests', { p_user_id: user.id })

    console.log('[dashboard] activate_pending_requests:', JSON.stringify(activated), 'err:', error?.message)

    if (error) {
      console.error('[dashboard] activate pending requests:', error.message)
    } else if (activated && (activated as (string | { id: string })[]).length > 0) {
      const validIds = (activated as (string | { id: string })[])
        .map((r) => (typeof r === 'string' ? r : r.id))
        .filter(Boolean) as string[]
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
      .select('id, service_type, status, event_date_start, event_time, location, city, guests_adults, guests_teens, guests_kids, cuisine_type, occasion, budget_min, budget_max, created_at')
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
    pending_confirmation: 'Pendiente',
    in_process:           'En proceso',
    paid:                 'Pagada',
    completed:            'Completada',
    cancelled:            'Cancelada',
    pending:              'Pendiente',
  }

  const STATUS_TEXT_COLORS: Record<string, string> = {
    new:                  'text-blue-600',
    active:               'text-emerald-600',
    pending_confirmation: 'text-amber-600',
    in_process:           'text-amber-600',
    paid:                 'text-emerald-600',
    completed:            'text-zinc-500',
    cancelled:            'text-red-500',
    pending:              'text-amber-600',
  }

  const SERVICE_LABELS: Record<string, string> = {
    single:   'Servicio único',
    multiple: 'Múltiples servicios',
    weekly:   'Semanal',
  }

  const OCCASION_LABELS: Record<string, string> = {
    birthday:          'Cumpleaños',
    family_reunion:    'Reunión familiar',
    bachelor_party:    'Despedida de soltero/a',
    friends_gathering: 'Reunión de amigos',
    romantic_dinner:   'Cena romántica',
    corporate:         'Corporativo',
    gastronomic:       'Gastronómico',
    other:             'Otro',
  }

  const CUISINE_LABELS: Record<string, string> = {
    local:         'Local / argentina',
    italian:       'Italiana',
    mediterranean: 'Mediterránea',
    seafood:       'Mariscos',
    french:        'Francesa',
    japanese:      'Japonesa',
    fusion:        'Fusión',
    chefs_special: 'A elección del chef',
  }

  const ACTIVE_STATUSES = new Set(['new', 'active', 'pending_confirmation', 'in_process', 'pending'])

  return (
    <div className="min-h-screen bg-zinc-50">
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

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-zinc-900">
            Hola, {userData?.first_name || 'bienvenido/a'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Aquí podés ver y gestionar tus solicitudes de chef.
          </p>
        </div>

        <Link
          href={wizardUrl}
          className="flex items-center gap-3 w-full bg-accent hover:bg-accent/90 text-white font-medium text-sm px-5 py-4 rounded-xl transition-colors mb-8"
        >
          <Plus className="w-5 h-5" />
          Nueva solicitud de chef
        </Link>

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {requests.map((req) => {
                const totalGuests =
                  (req.guests_adults ?? 0) +
                  (req.guests_teens ?? 0) +
                  (req.guests_kids ?? 0)

                const budget =
                  req.budget_min && req.budget_max
                    ? `$${Number(req.budget_min).toLocaleString('es-AR')} - $${Number(req.budget_max).toLocaleString('es-AR')}`
                    : req.budget_min
                    ? `Desde $${Number(req.budget_min).toLocaleString('es-AR')}`
                    : null

                const headline = [
                  req.event_date_start
                    ? new Date(req.event_date_start + 'T00:00:00').toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })
                    : null,
                  req.event_time,
                  budget,
                ].filter(Boolean).join(' · ')

                const lugar = [req.location, req.city].filter(Boolean).join(', ')
                const canCancel = req.status !== 'cancelled' && req.status !== 'completed'
                const isActive  = ACTIVE_STATUSES.has(req.status)

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wide ${STATUS_TEXT_COLORS[req.status] ?? 'text-zinc-500'}`}>
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                        {canCancel && <CancelButton requestId={req.id} />}
                      </div>
                      <p className="text-base font-bold text-zinc-900">
                        {SERVICE_LABELS[req.service_type] ?? req.service_type}
                      </p>
                      {headline && (
                        <p className="text-sm text-zinc-500 mt-0.5">{headline}</p>
                      )}
                    </div>

                    {/* Details rows */}
                    <div className="border-t border-zinc-100 px-5 py-1">
                      {totalGuests > 0 && (
                        <Row label="Personas" value={`${totalGuests} persona${totalGuests !== 1 ? 's' : ''}`} />
                      )}
                      {req.cuisine_type && (
                        <Row label="Menú" value={CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type} />
                      )}
                      {req.occasion && (
                        <Row label="Ocasión" value={OCCASION_LABELS[req.occasion] ?? req.occasion} />
                      )}
                      {lugar && (
                        <Row label="Lugar" value={lugar} />
                      )}
                      <Row
                        label="Propuestas"
                        value={
                          <span className={isActive ? 'text-amber-600 font-medium' : ''}>
                            Tienes 0 propuestas
                          </span>
                        }
                      />
                    </div>

                    {/* Footer message */}
                    {isActive && (
                      <div className="border-t border-zinc-100 px-5 py-3">
                        <p className="text-sm font-medium text-zinc-700">
                          En breve recibirás propuestas de nuestros chefs
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-400 shrink-0">{label}</span>
      <span className="text-sm text-zinc-700 text-right">{value}</span>
    </div>
  )
}
