import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { RequestsTabs } from './RequestsTabs'
import {
  REQUEST_SELECT,
  REQUEST_STATUS_GROUPS,
  REQUESTS_PAGE_SIZE,
  type ClientRequest,
} from './requests'

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

  // Carga inicial: SOLO solicitudes activas, filtradas en Supabase + acotadas.
  // Completadas y canceladas se cargan lazy desde RequestsTabs.
  const [{ data: userData }, { data: activeRequests }] = await Promise.all([
    supabase.from('users').select('first_name, first_surname, phone').eq('id', user.id).single(),
    supabase.from('service_requests')
      .select(REQUEST_SELECT)
      .eq('user_id', user.id)
      .in('status', REQUEST_STATUS_GROUPS.activas as unknown as string[])
      .order('created_at', { ascending: false })
      .limit(REQUESTS_PAGE_SIZE),
  ])

  const requests = (activeRequests ?? []) as unknown as ClientRequest[]

  // Conteos livianos por estado (solo el número, cero filas) para los badges.
  // Los registros completos de completadas/canceladas se cargan lazy al click.
  const countByStatus = (statuses: readonly string[]) =>
    supabase.from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', statuses as unknown as string[])

  const [{ count: activasCount }, { count: completadasCount }, { count: canceladasCount }] =
    await Promise.all([
      countByStatus(REQUEST_STATUS_GROUPS.activas),
      countByStatus(REQUEST_STATUS_GROUPS.completadas),
      countByStatus(REQUEST_STATUS_GROUPS.canceladas),
    ])

  const initialCounts = {
    activas:     activasCount ?? requests.length,
    completadas: completadasCount ?? 0,
    canceladas:  canceladasCount ?? 0,
  }

  // Conteo de propuestas (sin retiradas) de las solicitudes activas.
  const proposalCounts: Record<string, number> = {}
  const requestIds = requests.map((r) => r.id)
  if (requestIds.length > 0) {
    const { data: proposals } = await supabase
      .from('proposals')
      .select('request_id, status')
      .in('request_id', requestIds)
      .neq('status', 'withdrawn')
    for (const p of proposals ?? []) {
      proposalCounts[p.request_id] = (proposalCounts[p.request_id] ?? 0) + 1
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
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
          Mis solicitudes
        </h2>

        {/* ── Tabs (activas server-side, completadas/canceladas lazy) ── */}
        <RequestsTabs
          initialActive={{ requests, proposalCounts }}
          initialCounts={initialCounts}
          wizardUrl={wizardUrl}
        />
      </main>
    </div>
  )
}
