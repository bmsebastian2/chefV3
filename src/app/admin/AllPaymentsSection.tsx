// ============================================================================
// Panel admin · Pagos (ciclo completo)
//
// Visibilidad TEMPRANA de todos los pagos desde que entran por dLocalGo, en
// cualquier estado del escrow — no solo los "listos para liberar". Componente
// presentacional: recibe las filas de get_all_payments_admin() y los filtros
// seleccionados; agrega resúmenes, aplica filtros y renderiza tabla + tarjetas.
//
// Filtros vía GET con params PROPIOS (`pestado`, `pmes`) para no pisar el `?mes=`
// que usa la sección "Pagos liberados" de la misma página.
// ============================================================================

import { Wallet } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { StateInfoButton } from './StateInfoButton'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Servicio Único',
  multiple: 'Servicio Múltiple',
  weekly:   'Servicio Semanal',
}

export type AllPayment = {
  payment_id:         string
  dlocalgo_payment_id: string | null
  request_id:         string | null
  proposal_id:        string | null
  chef_id:            string | null
  chef_name:          string | null
  client_name:        string | null
  client_email:       string | null
  service_type:       string | null
  occasion:           string | null
  city:               string | null
  amount:             number | null
  currency:           string | null
  commission_amount:  number | null
  chef_payout_amount: number | null
  payment_status:     string | null
  booking_status:     string | null
  booking_pay_status: string | null
  payout_status:      string | null
  payment_created_at: string | null
  confirmed_at:       string | null
  completed_at:       string | null
  released_at:        string | null
  cancelled_at:       string | null
  lifecycle_state:    string
  client_confirmed:   boolean | null
}

// Config de cada estado del ciclo: etiqueta + clases del chip.
const STATE_CONFIG: Record<string, { label: string; chip: string }> = {
  pending:        { label: 'Iniciado',          chip: 'bg-zinc-100 text-zinc-600' },
  failed:         { label: 'Fallido/expirado',  chip: 'bg-red-50 text-red-600' },
  orphan:         { label: 'Sin reserva',       chip: 'bg-orange-100 text-orange-700' },
  escrow_held:    { label: 'Retenido',          chip: 'bg-amber-100 text-amber-700' },
  in_window:      { label: 'En ventana',        chip: 'bg-blue-100 text-blue-700' },
  releasable:     { label: 'A liberar',         chip: 'bg-emerald-100 text-emerald-700' },
  released:       { label: 'Liberado',          chip: 'bg-emerald-600 text-white' },
  refund_pending: { label: 'A reembolsar',      chip: 'bg-amber-200 text-amber-900' },
  refunded:       { label: 'Reembolsado',       chip: 'bg-zinc-100 text-zinc-500' },
  unknown:        { label: 'Otro',              chip: 'bg-zinc-100 text-zinc-500' },
}

// Tarjetas de resumen arriba: subconjunto curado del "dinero en tránsito".
const SUMMARY_STATES: { state: string; tone: 'amber' | 'blue' | 'emerald' | 'zinc' }[] = [
  { state: 'escrow_held',    tone: 'amber'   },
  { state: 'in_window',      tone: 'blue'    },
  { state: 'releasable',     tone: 'emerald' },
  { state: 'released',       tone: 'emerald' },
  { state: 'refund_pending', tone: 'amber'   },
]

function stateConf(s: string) {
  return STATE_CONFIG[s] ?? STATE_CONFIG.unknown
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function daysBetween(iso: string | null, ref = Date.now()) {
  if (!iso) return null
  return Math.floor((ref - new Date(iso).getTime()) / 86_400_000)
}

function serviceLabel(p: AllPayment) {
  return SERVICE_TYPE_LABELS[p.service_type ?? ''] ?? (p.service_type || '—')
}

// Texto contextual de "días en espera" según el estado.
function waitingText(p: AllPayment): string {
  switch (p.lifecycle_state) {
    case 'escrow_held': {
      const d = daysBetween(p.confirmed_at)
      return d == null ? '—' : `${d}d retenido`
    }
    case 'in_window': {
      // Ventana de 3 días desde completed_at antes de poder liberar.
      const d = daysBetween(p.completed_at)
      if (d == null) return '—'
      const left = Math.max(0, 3 - d)
      return left === 0 ? 'liberable hoy' : `faltan ${left}d`
    }
    case 'releasable': {
      const d = daysBetween(p.completed_at)
      return d == null ? 'listo' : `listo hace ${Math.max(0, d - 3)}d`
    }
    case 'pending':
    case 'failed':
    case 'orphan': {
      const d = daysBetween(p.payment_created_at)
      return d == null ? '—' : `hace ${d}d`
    }
    default:
      return '—'
  }
}

export function AllPaymentsSection({
  payments,
  selectedState,
  selectedMonth,
}: {
  payments: AllPayment[]
  selectedState?: string
  selectedMonth?: string
}) {
  // ── Resúmenes por estado (sobre TODAS las filas, dan el pulso global) ──
  const agg = new Map<string, { count: number; total: number }>()
  for (const p of payments) {
    const e = agg.get(p.lifecycle_state) ?? { count: 0, total: 0 }
    e.count += 1
    e.total += p.amount ?? 0
    agg.set(p.lifecycle_state, e)
  }

  // Meses disponibles (por fecha de pago), desc.
  const months = [...new Set(
    payments.map((p) => (p.payment_created_at ? monthKey(p.payment_created_at) : null)).filter(Boolean) as string[],
  )].sort().reverse()

  const stateFilter = selectedState && STATE_CONFIG[selectedState] ? selectedState : 'todos'
  const monthFilter = selectedMonth && months.includes(selectedMonth) ? selectedMonth : 'todos'

  // ── Filas filtradas para la tabla ──
  const rows = payments.filter((p) => {
    if (stateFilter !== 'todos' && p.lifecycle_state !== stateFilter) return false
    if (monthFilter !== 'todos') {
      if (!p.payment_created_at || monthKey(p.payment_created_at) !== monthFilter) return false
    }
    return true
  })

  const filteredTotal = rows.reduce((s, p) => s + (p.amount ?? 0), 0)

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-4 h-4 text-zinc-600" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Pagos · ciclo completo
        </h2>
        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
          {payments.length}
        </span>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
          <Wallet className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Todavía no hay pagos registrados.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de resumen por estado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {SUMMARY_STATES.map(({ state, tone }) => {
              const e = agg.get(state) ?? { count: 0, total: 0 }
              return (
                <div key={state} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stateConf(state).chip}`}>
                      {stateConf(state).label}
                    </span>
                    <StateInfoButton state={state} />
                  </div>
                  <p className={`font-serif text-xl font-bold leading-none ${
                    tone === 'emerald' ? 'text-emerald-700' : tone === 'blue' ? 'text-blue-700' : tone === 'amber' ? 'text-amber-700' : 'text-zinc-900'
                  }`}>
                    {formatPrice(e.total)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {e.count} {e.count === 1 ? 'pago' : 'pagos'}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Filtros */}
          <form method="get" className="flex flex-wrap items-center gap-2 mb-4">
            <input type="hidden" name="tab" value="pagos" />
            <select
              name="pestado"
              defaultValue={stateFilter}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(STATE_CONFIG)
                .filter(([k]) => k !== 'unknown')
                .map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
            </select>
            <select
              name="pmes"
              defaultValue={monthFilter}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            >
              <option value="todos">Todos los meses</option>
              {months.map((k) => (
                <option key={k} value={k}>{monthLabel(k)}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              Filtrar
            </button>
            <span className="text-xs text-zinc-400 ml-auto">
              {rows.length} {rows.length === 1 ? 'pago' : 'pagos'} · {formatPrice(filteredTotal)}
            </span>
          </form>

          {/* Tabla (desktop) — scroll horizontal: las columnas mantienen ancho
              legible (min-w) y se accede al resto deslizando; la 1ª columna
              (Cliente · Chef) queda fija como ancla de lectura. */}
          <div className="hidden md:block bg-white border border-zinc-100 rounded-xl shadow-sm overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="text-left  font-bold px-4 py-3 sticky left-0 z-20 bg-white border-r border-zinc-100">Cliente · Chef</th>
                  <th className="text-left  font-bold px-4 py-3">Servicio</th>
                  <th className="text-right font-bold px-4 py-3">Monto</th>
                  <th className="text-right font-bold px-4 py-3">Comisión</th>
                  <th className="text-right font-bold px-4 py-3">Neto</th>
                  <th className="text-left  font-bold px-4 py-3">Estado</th>
                  <th className="text-center font-bold px-4 py-3">Confirmó</th>
                  <th className="text-left  font-bold px-4 py-3">Fecha pago</th>
                  <th className="text-left  font-bold px-4 py-3">Espera</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.payment_id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-zinc-100">
                      <p className="font-semibold text-zinc-900">{p.client_name ?? 'Cliente'}</p>
                      <p className="text-xs text-zinc-400">{p.chef_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {serviceLabel(p)}
                      {p.city && <span className="text-zinc-400"> · {p.city}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700 tabular-nums">
                      {p.amount != null ? formatPrice(p.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                      {p.commission_amount != null ? formatPrice(p.commission_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {p.chef_payout_amount != null ? formatPrice(p.chef_payout_amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stateConf(p.lifecycle_state).chip}`}>
                        {stateConf(p.lifecycle_state).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.client_confirmed
                        ? <span className="text-emerald-600 font-bold">✔</span>
                        : <span className="text-amber-500 font-bold">✘</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(p.payment_created_at)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{waitingText(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-8">No hay pagos con estos filtros.</p>
            )}
          </div>

          {/* Tarjetas (mobile) */}
          <div className="md:hidden space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">No hay pagos con estos filtros.</p>
            ) : rows.map((p) => (
              <div key={p.payment_id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm">{p.client_name ?? 'Cliente'}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{p.chef_name ?? '—'}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${stateConf(p.lifecycle_state).chip}`}>
                    {stateConf(p.lifecycle_state).label}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3 mt-2">
                  <p className="text-xs text-zinc-400">
                    {serviceLabel(p)}{p.city && <> · {p.city}</>}<br />
                    {fmtDate(p.payment_created_at)} · {waitingText(p)} ·{' '}
                    {p.client_confirmed
                      ? <span className="text-emerald-600 font-semibold">confirmado ✔</span>
                      : <span className="text-amber-600 font-semibold">sin confirmar ✘</span>}
                  </p>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-base font-bold text-zinc-900 leading-none">
                      {p.amount != null ? formatPrice(p.amount) : '—'}
                    </p>
                    {p.chef_payout_amount != null && (
                      <p className="text-[11px] text-emerald-700 mt-0.5">neto {formatPrice(p.chef_payout_amount)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
