import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import Link from 'next/link'
import { ChefHat, Plus, ArrowRight, Calendar, MapPin, Users, Utensils } from 'lucide-react'
import { CancelButton } from './CancelButtonClient'
import { ProposalsLink } from './ProposalsLink'
import { formatPrice, formatPriceRange } from '@/lib/format'

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

  // Fetch proposal counts + first proposalId per request
  const requestIds = (requests ?? []).map((r) => r.id)
  const proposalCountMap: Record<string, number> = {}
  const proposalIdMap: Record<string, string> = {}
  if (requestIds.length > 0) {
    const { data: proposals } = await supabase
      .from('proposals')
      .select('id, request_id, status')
      .in('request_id', requestIds)
      .neq('status', 'withdrawn')
      .order('created_at', { ascending: true })
    for (const p of proposals ?? []) {
      proposalCountMap[p.request_id] = (proposalCountMap[p.request_id] ?? 0) + 1
      if (!proposalIdMap[p.request_id]) proposalIdMap[p.request_id] = p.id
    }
  }

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
    new:                  'text-sky-600',
    active:               'text-emerald-600',
    pending_confirmation: 'text-amber-600',
    in_process:           'text-amber-600',
    paid:                 'text-emerald-600',
    completed:            'text-zinc-500',
    cancelled:            'text-red-500',
    pending:              'text-amber-600',
  }

  const STATUS_DOT: Record<string, string> = {
    new:                  'bg-sky-500',
    active:               'bg-emerald-500',
    pending_confirmation: 'bg-amber-400',
    in_process:           'bg-amber-500',
    paid:                 'bg-emerald-400',
    completed:            'bg-zinc-400',
    cancelled:            'bg-red-400',
    pending:              'bg-amber-400',
  }

  const STATUS_LEFT_BORDER: Record<string, string> = {
    new:                  'border-l-sky-500',
    active:               'border-l-emerald-500',
    pending_confirmation: 'border-l-amber-400',
    in_process:           'border-l-amber-500',
    paid:                 'border-l-emerald-400',
    completed:            'border-l-zinc-300',
    cancelled:            'border-l-red-300',
    pending:              'border-l-amber-400',
  }

  const SERVICE_LABELS: Record<string, string> = {
    single:   'Servicio único',
    multiple: 'Múltiples servicios',
    weekly:   'Semanal',
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
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-16">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-px w-8 bg-accent rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Mi cuenta
            </span>
          </div>
          <h1 className="font-serif text-4xl font-semibold text-zinc-900 leading-tight mb-2">
            Hola, {userData?.first_name || 'bienvenido/a'}
          </h1>
          <p className="text-sm text-zinc-500">
            Gestioná tus solicitudes y revisá las propuestas de chefs.
          </p>
        </div>

        {/* ── CTA ── */}
        <Link
          href={wizardUrl}
          className="group inline-flex items-center gap-4 bg-accent hover:bg-accent/90 text-white pl-5 pr-4 py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-0.5 mb-12"
        >
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none mb-1">Nueva solicitud de chef</p>
            <p className="text-xs text-white/60 leading-none">Recibí propuestas en minutos</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/50 group-hover:translate-x-0.5 transition-transform ml-1" />
        </Link>

        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Mis solicitudes
          </h2>
          {requests && requests.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {requests.length}
            </span>
          )}
        </div>

        {/* ── Empty state ── */}
        {!requests || requests.length === 0 ? (
          <div className="relative overflow-hidden bg-white rounded-2xl border border-zinc-100 shadow-sm py-20 text-center">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
              <div className="absolute top-6 left-1/4 w-40 h-40 rounded-full border-[1.5px] border-zinc-800" />
              <div className="absolute bottom-4 right-1/4 w-24 h-24 rounded-full border-[1.5px] border-zinc-800" />
            </div>
            <div className="relative z-10">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                  <ChefHat className="w-9 h-9 text-zinc-300" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-lg">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-800 mb-2">
                Tu mesa está lista
              </h3>
              <p className="text-sm text-zinc-400 mb-7 max-w-[260px] mx-auto leading-relaxed">
                Hacé tu primera solicitud y recibí propuestas de chefs exclusivos en minutos.
              </p>
              <Link
                href={wizardUrl}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors shadow-md shadow-accent/20"
              >
                <Plus className="w-4 h-4" />
                Solicitar un chef
              </Link>
            </div>
          </div>
        ) : (
          /* ── Requests grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => {
              const totalGuests =
                (req.guests_adults ?? 0) +
                (req.guests_teens ?? 0) +
                (req.guests_kids ?? 0)

              const budget =
                req.budget_min && req.budget_max
                  ? formatPriceRange(Number(req.budget_min), Number(req.budget_max))
                  : req.budget_min
                  ? `Desde ${formatPrice(Number(req.budget_min))}`
                  : null

              const formattedDate = req.event_date_start
                ? new Date(req.event_date_start + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                : null

              const lugar        = [req.location, req.city].filter(Boolean).join(', ')
              const canCancel    = req.status !== 'cancelled' && req.status !== 'completed'
              const isActive     = ACTIVE_STATUSES.has(req.status)
              const proposalCount = proposalCountMap[req.id] ?? 0
              const isCancelled  = req.status === 'cancelled'

              return (
                <div
                  key={req.id}
                  className={[
                    'group bg-white rounded-xl overflow-hidden shadow-sm',
                    'border border-zinc-100 border-l-4',
                    STATUS_LEFT_BORDER[req.status] ?? 'border-l-zinc-200',
                    'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                    isCancelled ? 'opacity-55' : '',
                  ].join(' ')}
                >
                  {/* Top */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 ${STATUS_TEXT_COLORS[req.status] ?? 'text-zinc-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[req.status] ?? 'bg-zinc-400'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </span>
                      {canCancel && <CancelButton requestId={req.id} />}
                    </div>

                    <p className="font-serif text-[15px] font-semibold text-zinc-900 leading-snug">
                      {SERVICE_LABELS[req.service_type] ?? req.service_type}
                    </p>
                    {budget && (
                      <p className="text-xs font-medium text-zinc-400 mt-0.5">{budget}</p>
                    )}
                  </div>

                  {/* Detail rows */}
                  <div className="border-t border-zinc-50 px-4 py-2">
                    {(formattedDate || req.event_time) && (
                      <DetailRow
                        icon={<Calendar className="w-3 h-3" />}
                        value={[formattedDate, req.event_time].filter(Boolean).join(' · ')}
                      />
                    )}
                    {totalGuests > 0 && (
                      <DetailRow
                        icon={<Users className="w-3 h-3" />}
                        value={`${totalGuests} persona${totalGuests !== 1 ? 's' : ''}`}
                      />
                    )}
                    {req.cuisine_type && (
                      <DetailRow
                        icon={<Utensils className="w-3 h-3" />}
                        value={CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type}
                      />
                    )}
                    {lugar && (
                      <DetailRow
                        icon={<MapPin className="w-3 h-3" />}
                        value={lugar}
                      />
                    )}
                  </div>

                  {/* Proposals footer */}
                  <div className={`border-t px-4 py-3 flex items-center justify-between ${proposalCount > 0 ? 'border-zinc-100 bg-zinc-50/60' : 'border-zinc-50'}`}>
                    <span className="text-[11px] font-medium text-zinc-400">Propuestas</span>
                    {proposalCount > 0 ? (
                      <ProposalsLink
                        href={`/client-dashboard/${req.id}/proposals`}
                        count={proposalCount}
                      />
                    ) : (
                      <span className={`text-[11px] font-medium ${isActive ? 'text-amber-500' : 'text-zinc-400'}`}>
                        {isActive ? 'En espera…' : 'Sin propuestas'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-50 last:border-0">
      <span className="text-zinc-300 shrink-0">{icon}</span>
      <span className="text-xs text-zinc-500 truncate">{value}</span>
    </div>
  )
}
