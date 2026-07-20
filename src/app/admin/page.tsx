export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/utils/supabase/admin'
import { Banknote, Undo2, ShieldCheck, CheckCircle2, Trophy, Wallet, ClipboardList, Users } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { ProcessButton } from './ProcessButton'
import { PaymentRefChip } from './PaymentRefChip'
import { AllPaymentsSection, type AllPayment } from './AllPaymentsSection'
import { RequestsMonitorSection } from './RequestsMonitorSection'
import { ChefsManagementSection } from './ChefsManagementSection'
import { AdminTabs } from './AdminTabs'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Servicio Único',
  multiple: 'Servicio Múltiple',
  weekly:   'Servicio Semanal',
}

type Payout = {
  booking_id:         string
  chef_id:            string
  request_id:         string
  total_amount:       number
  commission_amount:  number
  chef_payout_amount: number
  currency:           string
  completed_at:       string
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

type Released = {
  booking_id:         string
  chef_id:            string
  chef_name:          string
  client_name:        string
  client_email:       string | null
  service_type:       string | null
  occasion:           string | null
  city:               string | null
  total_amount:       number
  commission_amount:  number
  chef_payout_amount: number
  currency:           string
  completed_at:       string | null
  released_at:        string
  payout_ref:         string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Clave de agrupación mensual ('YYYY-MM') derivada del momento de liberación.
function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function serviceLabel(r: Released) {
  return SERVICE_TYPE_LABELS[r.service_type ?? ''] ?? (r.service_type || '—')
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

  // ── Pagos liberados (histórico de payouts ya girados) ──────────────────────
  const { data: releasedRaw } = await admin.rpc('get_released_bookings')
  const released = (releasedRaw ?? []) as Released[]

  // Agrupar por mes de liberación.
  const byMonth = new Map<string, Released[]>()
  for (const r of released) {
    const k = monthKey(r.released_at)
    if (!byMonth.has(k)) byMonth.set(k, [])
    byMonth.get(k)!.push(r)
  }
  const monthKeys = [...byMonth.keys()].sort().reverse() // más reciente primero

  // Mes seleccionado: ?mes= si existe y tiene datos, si no el más reciente.
  const selectedMonth = mes && byMonth.has(mes) ? mes : monthKeys[0]
  const monthRows = selectedMonth ? byMonth.get(selectedMonth)! : []

  // Métricas del mes seleccionado.
  const totalNet        = monthRows.reduce((s, r) => s + r.chef_payout_amount, 0)
  const totalCommission = monthRows.reduce((s, r) => s + r.commission_amount, 0)
  const releasedCount   = monthRows.length
  const avgNet          = releasedCount ? totalNet / releasedCount : 0

  // Chef del mes (mayor neto recibido en el mes seleccionado).
  const chefAgg = new Map<string, { name: string; count: number; net: number }>()
  for (const r of monthRows) {
    const e = chefAgg.get(r.chef_id) ?? { name: r.chef_name, count: 0, net: 0 }
    e.count += 1
    e.net   += r.chef_payout_amount
    chefAgg.set(r.chef_id, e)
  }
  const topChef = [...chefAgg.values()].sort((a, b) => b.net - a.net)[0]

  // Tendencia: últimos 6 meses con liberaciones (neto total por mes), asc.
  const trend = monthKeys.slice(0, 6).reverse().map((k) => ({
    key:   k,
    total: byMonth.get(k)!.reduce((s, r) => s + r.chef_payout_amount, 0),
  }))
  const trendMax = Math.max(1, ...trend.map((t) => t.total))

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
                  <p className="font-semibold text-zinc-900 text-sm">Chef {chefNameMap[p.chef_id] ?? '—'}</p>
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
                <ProcessButton id={p.booking_id} kind="payout" amount={p.chef_payout_amount} />
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
            id: 'liberados',
            label: 'Liberados',
            icon: <CheckCircle2 className="w-4 h-4" />,
            content: (
      <section>
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Pagos liberados
            </h2>
          </div>
          {monthKeys.length > 0 && (
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="tab" value="liberados" />
              <select
                name="mes"
                defaultValue={selectedMonth}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              >
                {monthKeys.map((k) => (
                  <option key={k} value={k}>{monthLabel(k)}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Ver
              </button>
            </form>
          )}
        </div>

        {monthKeys.length === 0 ? (
          <EmptyCard text="Todavía no liberaste ningún pago." />
        ) : (
          <>
            {/* Resumen del mes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <SummaryCard
                label="Liberado a chefs"
                value={formatPrice(totalNet)}
                hint={`${releasedCount} ${releasedCount === 1 ? 'liberación' : 'liberaciones'}`}
                tone="emerald"
              />
              <SummaryCard
                label="Comisión plataforma"
                value={formatPrice(totalCommission)}
                hint="retenido por GetChef"
                tone="zinc"
              />
              <SummaryCard
                label="Promedio por servicio"
                value={formatPrice(avgNet)}
                hint="neto al chef"
                tone="zinc"
              />
            </div>

            {/* Tendencia: neto liberado por mes (últimos 6) */}
            {trend.length > 1 && (
              <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Tendencia · neto liberado por mes
                </p>
                <div className="flex items-end justify-between gap-2 h-24">
                  {trend.map((t) => (
                    <div key={t.key} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                      <div
                        className={`w-full rounded-t-md transition-colors ${
                          t.key === selectedMonth ? 'bg-emerald-500' : 'bg-emerald-200'
                        }`}
                        style={{ height: `${Math.max(6, (t.total / trendMax) * 100)}%` }}
                        title={formatPrice(t.total)}
                      />
                      <span className="text-[9px] font-medium text-zinc-400 whitespace-nowrap">
                        {monthLabel(t.key).split(' ')[0].slice(0, 3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chef del mes */}
            {topChef && (
              <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 bg-amber-50/60 border border-amber-100 rounded-xl">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-900">Chef del mes:</span>{' '}
                  {topChef.name} · {topChef.count} {topChef.count === 1 ? 'liberación' : 'liberaciones'} ·{' '}
                  <span className="font-semibold text-amber-700">{formatPrice(topChef.net)}</span> neto
                </p>
              </div>
            )}

            {/* Detalle: tabla en desktop, tarjetas en mobile */}
            <div className="hidden sm:block bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="text-left  font-bold px-4 py-3">Chef · Cliente</th>
                    <th className="text-left  font-bold px-4 py-3">Servicio</th>
                    <th className="text-right font-bold px-4 py-3">Bruto</th>
                    <th className="text-right font-bold px-4 py-3">Comisión</th>
                    <th className="text-right font-bold px-4 py-3">Neto</th>
                    <th className="text-left  font-bold px-4 py-3">Liberado</th>
                    <th className="text-left  font-bold px-4 py-3">Ref.</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((r) => (
                    <tr key={r.booking_id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900">{r.chef_name}</p>
                        <p className="text-xs text-zinc-400">{r.client_name}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {serviceLabel(r)}
                        {r.city && <span className="text-zinc-400"> · {r.city}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums">{formatPrice(r.total_amount)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">{formatPrice(r.commission_amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">{formatPrice(r.chef_payout_amount)}</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(r.released_at)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{r.payout_ref || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-3">
              {monthRows.map((r) => (
                <div key={r.booking_id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm">{r.chef_name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{r.client_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Neto</p>
                      <p className="font-serif text-base font-bold text-emerald-700 leading-none">
                        {formatPrice(r.chef_payout_amount)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    {serviceLabel(r)}{r.city && <> · {r.city}</>} · Liberado {fmtDate(r.released_at)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Bruto {formatPrice(r.total_amount)} · comisión {formatPrice(r.commission_amount)}
                    {r.payout_ref && <> · ref {r.payout_ref}</>}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
            ),
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

function SummaryCard({
  label, value, hint, tone,
}: {
  label: string
  value: string
  hint:  string
  tone:  'emerald' | 'zinc'
}) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`font-serif text-2xl font-bold leading-tight mt-1 ${tone === 'emerald' ? 'text-emerald-700' : 'text-zinc-900'}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>
    </div>
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
