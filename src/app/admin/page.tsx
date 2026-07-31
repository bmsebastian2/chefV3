export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/utils/supabase/admin'
import { Banknote, Undo2, ShieldCheck, CheckCircle2, Wallet, ClipboardList, Users, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { ProcessButton } from './ProcessButton'
import { PaymentRefChip } from './PaymentRefChip'
import { AllPaymentsSection, type AllPayment } from './AllPaymentsSection'
import { RequestsMonitorSection } from './RequestsMonitorSection'
import { ChefsManagementSection } from './ChefsManagementSection'
import { ReleasedPayoutsSection } from './ReleasedPayoutsSection'
import { AdminTabs } from './AdminTabs'

type Payout = {
  booking_id:         string
  chef_id:            string
  request_id:         string
  total_amount:       number
  commission_amount:  number
  chef_payout_amount: number
  currency:           string
  completed_at:       string
  // ¿El chef tiene cuenta bancaria cargada? No bloquea el giro (se hace por
  // fuera), pero se advierte antes de marcarlo.
  has_payout_account: boolean
}

type PendingRefund = {
  kind:                'booking' | 'orphan'
  id:                  string      // booking_id | payment_id
  request_id:          string | null
  dlocalgo_payment_id: string | null
  client_name:         string | null
  client_email:        string | null
  amount:              number | null
  currency:            string | null
  cancelled_at:        string | null
  cancel_reason:       string | null
  created_at:          string | null
  // Con dos pasarelas, el admin necesita saber DÓNDE reembolsar y con qué id.
  // El reembolso de PayPal va contra la CAPTURA, no contra la orden.
  provider:            'dlocalgo' | 'paypal' | null
  provider_capture_id: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; pestado?: string; pmes?: string; tab?: string }>
}) {
  const { mes, pestado, pmes, tab } = await searchParams
  const admin = createAdminClient()

  // ── Pagos del ciclo completo (visibilidad temprana: todos los estados) ──
  const { data: allPaymentsRaw } = await admin.rpc('get_all_payments_admin')
  const allPayments = (allPaymentsRaw ?? []) as AllPayment[]

  // ── Payouts liberables (completed + paid + payout pending + 3 días) ──
  const { data: payoutsRaw } = await admin.rpc('get_releasable_bookings')
  const payouts = (payoutsRaw ?? []) as Payout[]

  // ── Reembolsos pendientes: bookings cancelados con plata retenida + pagos
  //    huérfanos (completed sin booking). La RPC ya trae identidad del cliente. ──
  const { data: refundsRaw } = await admin.rpc('get_pending_refunds_admin')
  const refunds = (refundsRaw ?? []) as PendingRefund[]

  // ── Nombres de chefs (para payouts) ──
  const chefIds = [...new Set(payouts.map((p) => p.chef_id))]
  const chefNameMap: Record<string, string> = {}
  if (chefIds.length > 0) {
    const { data: profiles } = await admin
      .from('chef_profiles')
      .select('id, user_id')
      .in('id', chefIds)
    const userIds = (profiles ?? []).map((p) => p.user_id as string)
    const { data: users } = userIds.length > 0
      ? await admin.from('users').select('id, first_name, first_surname').in('id', userIds)
      : { data: [] as { id: string; first_name: string | null; first_surname: string | null }[] }
    const userById = Object.fromEntries((users ?? []).map((u) => [u.id, u]))
    for (const p of profiles ?? []) {
      const u = userById[p.user_id as string]
      chefNameMap[p.id as string] = u
        ? [u.first_name, u.first_surname].filter(Boolean).join(' ') || 'Chef'
        : 'Chef'
    }
  }

  // ── Pagos liberados: SOLO el conteo, para el badge de la pestaña ───────────
  // El histórico lo trae ReleasedPayoutsSection de forma lazy y paginada al
  // abrirse la pestaña. Acá basta un count(*) con head:true (no baja filas), que
  // sí necesitamos en el render inicial: el badge se ve sin abrir la pestaña.
  const { count: releasedCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('payout_status', 'released')

  return (
    <main className="max-w-4xl mx-auto px-6 pt-12 pb-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Administración
          </span>
        </div>
        <h1 className="font-serif text-4xl font-semibold text-zinc-900 leading-tight mb-2">
          Pagos y reembolsos
        </h1>
        <p className="text-sm text-zinc-500">
          Liberá pagos a chefs y cerrá reembolsos. Hacé el giro real por fuera y marcalo acá.
        </p>
      </div>

      <AdminTabs
        initialTab={tab}
        tabs={[
          {
            id: 'pagos',
            label: 'Pagos',
            icon: <Wallet className="w-4 h-4" />,
            content: (
              <AllPaymentsSection
                payments={allPayments}
                selectedState={pestado}
                selectedMonth={pmes}
              />
            ),
          },
          {
            id: 'pendientes',
            label: 'Pendientes',
            icon: <Banknote className="w-4 h-4" />,
            badge: payouts.length + refunds.length || undefined,
            content: (
              <>
      {/* ── Payouts ── */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Pagos a liberar
          </h2>
          {payouts.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {payouts.length}
            </span>
          )}
        </div>

        {payouts.length === 0 ? (
          <EmptyCard text="No hay pagos pendientes de liberar." />
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.booking_id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 text-sm">Chef {chefNameMap[p.chef_id] ?? '—'}</p>
                    {!p.has_payout_account && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        Sin datos bancarios
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Completado {fmtDate(p.completed_at)} · total {formatPrice(p.total_amount)} · comisión {formatPrice(p.commission_amount)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">A girar</p>
                  <p className="font-serif text-lg font-bold text-emerald-700 leading-none">
                    {formatPrice(p.chef_payout_amount)}
                  </p>
                </div>
                <ProcessButton
                  id={p.booking_id}
                  kind="payout"
                  amount={p.chef_payout_amount}
                  hasPayoutAccount={p.has_payout_account}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Refunds ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Undo2 className="w-4 h-4 text-amber-600" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Reembolsos pendientes
          </h2>
          {refunds.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {refunds.length}
            </span>
          )}
        </div>

        {refunds.length === 0 ? (
          <EmptyCard text="No hay reembolsos pendientes." />
        ) : (
          <div className="space-y-3">
            {refunds.map((r) => (
              <div key={`${r.kind}-${r.id}`} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 text-sm">{r.client_name ?? 'Cliente'}</p>
                    {r.kind === 'orphan' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Sin reserva
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {r.client_email && <>{r.client_email} · </>}
                    {r.kind === 'booking'
                      ? <>Cancelado {fmtDate(r.cancelled_at)}</>
                      : <>Pagado {fmtDate(r.created_at)}</>}
                    {r.cancel_reason && <> · {r.cancel_reason}</>}
                  </p>
                  <PaymentRefChip
                    provider={r.provider}
                    orderId={r.dlocalgo_payment_id}
                    captureId={r.provider_capture_id}
                  />
                </div>
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">A reembolsar</p>
                  <p className="font-serif text-lg font-bold text-amber-700 leading-none">
                    {r.amount != null ? formatPrice(r.amount) : '—'}
                  </p>
                </div>
                <ProcessButton id={r.id} kind={r.kind === 'orphan' ? 'orphan' : 'refund'} amount={r.amount} />
              </div>
            ))}
          </div>
        )}
      </section>
              </>
            ),
          },
          {
            id: 'pagados',
            label: 'Pagados',
            icon: <CheckCircle2 className="w-4 h-4" />,
            badge: releasedCount || undefined,
            // Histórico de giros al chef: se monta (y recién ahí consulta) al
            // abrir la pestaña. ?mes= solo fija el mes inicial; a partir de ahí
            // el selector cambia de mes sin recargar la página.
            content: <ReleasedPayoutsSection initialMonth={mes} />,
          },
          {
            id: 'solicitudes',
            label: 'Solicitudes',
            icon: <ClipboardList className="w-4 h-4" />,
            content: <RequestsMonitorSection />,
          },
          {
            id: 'chefs',
            label: 'Chefs',
            icon: <Users className="w-4 h-4" />,
            content: <ChefsManagementSection />,
          },
        ]}
      />
    </main>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
      <ShieldCheck className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
      <p className="text-sm text-zinc-400">{text}</p>
    </div>
  )
}
