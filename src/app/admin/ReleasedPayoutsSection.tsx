'use client'

// ============================================================================
// Panel admin · Pagos liberados al chef (LAZY)
//
// Vive dentro de la pestaña "Pagados". AdminTabs monta este componente recién la
// primera vez que se abre esa pestaña, así que la carga (al montarse) es el
// disparador lazy: /admin ya no trae el histórico completo en cada request.
//
// Antes esto vivía en page.tsx y leía get_released_bookings() SIN límite,
// agrupando por mes en TS. Ahora llama a getReleasedPayoutsForAdmin, que pagina
// por mes y trae los agregados YA CALCULADOS en SQL — sumarlos acá daría los
// totales de la página visible, no los del mes.
//
// Un mes = un "corte" de caja: el selector cambia de mes y resetea la paginación.
// ============================================================================

import { useState, useEffect, useTransition } from 'react'
import { CheckCircle2, Inbox, AlertCircle, Trophy } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { getReleasedPayoutsForAdmin } from './actions'

type Result = NonNullable<Awaited<ReturnType<typeof getReleasedPayoutsForAdmin>>['data']>
type PayoutRow = Result['rows'][number]
type Summary = Result['summary']

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Servicio Único',
  multiple: 'Servicio Múltiple',
  weekly:   'Servicio Semanal',
}

function serviceLabel(r: PayoutRow) {
  return SERVICE_TYPE_LABELS[r.service_type ?? ''] ?? (r.service_type || '—')
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// 'YYYY-MM' → 'Julio 2026'. La clave la arma la RPC con to_char(released_at,
// 'YYYY-MM'), así que se parsea como fecha local y NO con new Date(key) (que
// interpretaría 'YYYY-MM' como UTC y podría correr el mes hacia atrás).
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ReleasedPayoutsSection({ initialMonth }: { initialMonth?: string }) {
  const [loaded, setLoaded]   = useState(false)   // ¿ya se trajo al menos una vez?
  const [rows, setRows]       = useState<PayoutRow[]>([])
  const [total, setTotal]     = useState(0)
  const [months, setMonths]   = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [month, setMonth]     = useState<string | null>(initialMonth ?? null)
  const [error, setError]     = useState<string | null>(null)
  const [page, setPage]       = useState(0)
  const [pending, startTransition] = useTransition()

  // Carga un lote. reset=true reemplaza (apertura / cambio de mes);
  // reset=false agrega (Cargar más).
  function load(m: string | null, nextPage: number, reset: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await getReleasedPayoutsForAdmin({ month: m, page: nextPage })
      if (res.error || !res.data) {
        setError(res.error ?? 'No se pudieron cargar los pagos liberados')
        return
      }
      setRows((prev) => (reset ? res.data!.rows : [...prev, ...res.data!.rows]))
      setTotal(res.data.total)
      setMonths(res.data.months)
      setSummary(res.data.summary)
      // El mes lo resuelve la RPC: si el pedido no tiene datos devuelve el más
      // reciente. Nos sincronizamos con lo que volvió, no con lo que pedimos.
      setMonth(res.data.month)
      setPage(nextPage)
      setLoaded(true)
    })
  }

  // Carga lazy: al montarse (la pestaña "Pagados" se abrió por primera vez).
  // El setState dentro del effect es deliberado — montarse ES el disparador de
  // la carga, igual que en las otras secciones lazy del panel — y corre una sola
  // vez: initialMonth solo fija el mes de arranque, después manda el selector.
  useEffect(() => {
    load(initialMonth ?? null, 0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectMonth(m: string) {
    load(m, 0, true)
  }

  const hasMore   = rows.length < total
  const firstLoad = pending && !loaded
  const topChef   = summary?.top_chef
  const trend     = summary?.trend ?? []
  const trendMax  = Math.max(1, ...trend.map((t) => t.total))

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Pagos liberados
          </h2>
        </div>
        {months.length > 0 && month && (
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => selectMonth(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50 transition-colors"
            >
              {months.map((k) => (
                <option key={k} value={k}>{monthLabel(k)}</option>
              ))}
            </select>
            <span className="text-xs text-zinc-400">
              {total} {total === 1 ? 'liberación' : 'liberaciones'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {firstLoad ? (
        <RowsSkeleton />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
          <Inbox className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Todavía no liberaste ningún pago.</p>
        </div>
      ) : (
        <>
          {/* ── Resumen del mes (agregados de TODO el mes, no de la página) ── */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <SummaryCard
                label="Liberado a chefs"
                value={formatPrice(summary.total_net)}
                hint={`${summary.released_count} ${summary.released_count === 1 ? 'liberación' : 'liberaciones'}`}
                tone="emerald"
              />
              <SummaryCard
                label="Comisión plataforma"
                value={formatPrice(summary.total_commission)}
                hint="retenido por GetChef"
                tone="zinc"
              />
              <SummaryCard
                label="Promedio por servicio"
                value={formatPrice(summary.avg_net)}
                hint="neto al chef"
                tone="zinc"
              />
            </div>
          )}

          {/* ── Tendencia: neto liberado por mes (últimos 6) ── */}
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
                        t.key === month ? 'bg-emerald-500' : 'bg-emerald-200'
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

          {/* ── Chef del mes ── */}
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

          {/* ── Detalle: tabla en desktop, tarjetas en mobile ── */}
          <div className="hidden sm:block bg-white border border-zinc-100 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="text-left  font-bold px-4 py-3">Chef · Cliente</th>
                  <th className="text-left  font-bold px-4 py-3">Servicio</th>
                  <th className="text-right font-bold px-4 py-3">Bruto</th>
                  <th className="text-right font-bold px-4 py-3">Comisión</th>
                  <th className="text-right font-bold px-4 py-3">Neto</th>
                  <th className="text-left  font-bold px-4 py-3">Liberado</th>
                  <th className="text-left  font-bold px-4 py-3">N° transferencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {fmtDate(r.released_at)}
                      {/* Auditoría: en blanco para las liberaciones previas a released_by. */}
                      {r.released_by_name && (
                        <span className="block text-[11px] text-zinc-400">por {r.released_by_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono break-all">{r.payout_ref || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-3">
            {rows.map((r) => (
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
                  {r.released_by_name && <> por {r.released_by_name}</>}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Bruto {formatPrice(r.total_amount)} · comisión {formatPrice(r.commission_amount)}
                </p>
                {r.payout_ref && (
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono break-all">
                    N° {r.payout_ref}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Cargar más */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => load(month, page + 1, false)}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                {pending ? 'Cargando…' : `Cargar más (${total - rows.length} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
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

function RowsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 bg-zinc-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-zinc-50 rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-zinc-100 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}
