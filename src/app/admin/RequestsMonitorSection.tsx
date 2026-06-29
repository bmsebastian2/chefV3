'use client'

// ============================================================================
// Panel admin · Monitoreo de solicitudes (LAZY)
//
// Vive dentro de la pestaña "Solicitudes". AdminTabs monta este componente
// recién la primera vez que se abre esa pestaña, así que la carga (al montarse)
// es el disparador lazy: no se trae nada hasta entrar a la pestaña.
//
// Llama a getRequestsForAdmin (paginada, filtrada server-side) y muestra:
// tarjetas de resumen, filtros, tabla (desktop) / tarjetas (mobile) y
// "Cargar más". Estados de loading y vacío. Los tipos se derivan de la action.
// ============================================================================

import { useState, useEffect, useTransition } from 'react'
import { ClipboardList, Inbox, AlertCircle } from 'lucide-react'
import { formatPriceRange } from '@/lib/format'
import { resolveCity } from '@/lib/maps/cities'
import { getRequestsForAdmin } from './actions'

type Result = NonNullable<Awaited<ReturnType<typeof getRequestsForAdmin>>['data']>
type RequestRow = Result['rows'][number]
type Summary = Result['summary']

type Filters = {
  status:      string
  serviceType: string
  city:        string
  dateRange:   string   // 'all' | '7' | '30'
}

const DEFAULT_FILTERS: Filters = {
  status:      'new',
  serviceType: 'todos',
  city:        'todos',
  dateRange:   'all',
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Único',
  multiple: 'Múltiple',
  weekly:   'Semanal',
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'new',                  label: 'Activas' },
  { value: 'pending_confirmation', label: 'Sin confirmar' },
  { value: 'completed',            label: 'Completadas' },
  { value: 'cancelled',            label: 'Canceladas / caducadas' },
  { value: 'todos',                label: 'Todos los estados' },
]

function serviceLabel(t: string) {
  return SERVICE_TYPE_LABELS[t] ?? t
}

// Nombre lindo de ciudad: resuelve contra el catálogo de Nicaragua; si no
// matchea, muestra el valor crudo tal como vino de la solicitud.
function cityLabel(raw: string) {
  return resolveCity(raw)?.entry.name ?? raw
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Número de referencia legible derivado del UUID (estable, sin tocar la DB).
// Sirve para identificar la solicitud en soporte / seguimiento.
function refOf(id: string) {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

// Estado visible de cada fila (las caducadas son cancelled con motivo especial).
function statusChip(r: RequestRow): { label: string; chip: string } {
  switch (r.status) {
    case 'new':
    case 'active':
    case 'pending':
      return { label: 'Activa', chip: 'bg-emerald-100 text-emerald-700' }
    case 'pending_confirmation':
      return { label: 'Sin confirmar', chip: 'bg-amber-100 text-amber-700' }
    case 'completed':
      return { label: 'Completada', chip: 'bg-blue-100 text-blue-700' }
    case 'cancelled':
      return /caduc/i.test(r.cancel_reason ?? '')
        ? { label: 'Caducada', chip: 'bg-zinc-100 text-zinc-500' }
        : { label: 'Cancelada', chip: 'bg-zinc-100 text-zinc-500' }
    default:
      return { label: r.status, chip: 'bg-zinc-100 text-zinc-500' }
  }
}

function guestsOf(r: RequestRow): string {
  const sum = (r.guests_adults ?? 0) + (r.guests_teens ?? 0) + (r.guests_kids ?? 0)
  const n = r.cuantas_personas ?? (sum > 0 ? sum : null)
  return n != null ? String(n) : '—'
}

function budgetOf(r: RequestRow): string {
  if (r.budget_min != null && r.budget_max != null) return formatPriceRange(r.budget_min, r.budget_max)
  if (r.budget_min != null) return formatPriceRange(r.budget_min, r.budget_min)
  return '—'
}

// dateRange ('7' | '30' | 'all') → fecha ISO desde la cual filtrar created_at.
function dateFromOf(range: string): string | null {
  if (range !== '7' && range !== '30') return null
  const d = new Date()
  d.setDate(d.getDate() - Number(range))
  return d.toISOString().slice(0, 10)
}

export function RequestsMonitorSection() {
  const [loaded, setLoaded]   = useState(false)   // ¿ya se trajo al menos una vez?
  const [rows, setRows]       = useState<RequestRow[]>([])
  const [total, setTotal]     = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [error, setError]     = useState<string | null>(null)
  const [page, setPage]       = useState(0)
  const [pending, startTransition] = useTransition()

  // Carga un lote. reset=true reemplaza (apertura / cambio de filtro);
  // reset=false agrega (Cargar más).
  function load(f: Filters, nextPage: number, reset: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await getRequestsForAdmin({
        status:      f.status,
        serviceType: f.serviceType,
        city:        f.city,
        dateFrom:    dateFromOf(f.dateRange),
        page:        nextPage,
      })
      if (res.error || !res.data) {
        setError(res.error ?? 'No se pudieron cargar las solicitudes')
        return
      }
      setRows((prev) => (reset ? res.data!.rows : [...prev, ...res.data!.rows]))
      setTotal(res.data.total)
      setSummary(res.data.summary)
      setPage(nextPage)
      setLoaded(true)
    })
  }

  // Carga lazy: al montarse (la pestaña "Solicitudes" se abrió por primera vez).
  useEffect(() => {
    load(DEFAULT_FILTERS, 0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch }
    setFilters(next)
    load(next, 0, true)
  }

  const topCity   = summary?.cities[0]
  const hasMore   = rows.length < total
  const firstLoad = pending && !loaded

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList className="w-4 h-4 text-zinc-600" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Solicitudes de clientes
        </h2>
      </div>

      <div>
          {/* ── Resumen (global, no depende de los filtros) ── */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Solicitudes" value={summary.total_all} />
              <StatCard label="Activas" value={summary.active} tone="emerald" />
              <StatCard label="Sin propuestas" value={summary.without_proposals} tone="amber" />
              <StatCard
                label="Ciudad top"
                value={topCity ? cityLabel(topCity.city) : '—'}
                hint={topCity ? `${topCity.count} ${topCity.count === 1 ? 'solicitud' : 'solicitudes'}` : undefined}
              />
            </div>
          )}

          {/* ── Filtros ── */}
          {summary && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <FilterSelect
                value={filters.status}
                onChange={(v) => applyFilter({ status: v })}
                disabled={pending}
                options={STATUS_OPTIONS}
              />
              <FilterSelect
                value={filters.serviceType}
                onChange={(v) => applyFilter({ serviceType: v })}
                disabled={pending}
                options={[
                  { value: 'todos',    label: 'Todos los tipos' },
                  { value: 'single',   label: 'Único' },
                  { value: 'multiple', label: 'Múltiple' },
                  { value: 'weekly',   label: 'Semanal' },
                ]}
              />
              <FilterSelect
                value={filters.city}
                onChange={(v) => applyFilter({ city: v })}
                disabled={pending}
                options={[
                  { value: 'todos', label: 'Todas las ciudades' },
                  ...summary.cities.map((c) => ({ value: c.city, label: `${cityLabel(c.city)} (${c.count})` })),
                ]}
              />
              <FilterSelect
                value={filters.dateRange}
                onChange={(v) => applyFilter({ dateRange: v })}
                disabled={pending}
                options={[
                  { value: 'all', label: 'Cualquier fecha' },
                  { value: '7',   label: 'Últimos 7 días' },
                  { value: '30',  label: 'Últimos 30 días' },
                ]}
              />
              <span className="text-xs text-zinc-400 ml-auto">
                {total} {total === 1 ? 'solicitud' : 'solicitudes'}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Loading inicial ── */}
          {firstLoad ? (
            <RowsSkeleton />
          ) : rows.length === 0 ? (
            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
              <Inbox className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                {filters.status === DEFAULT_FILTERS.status &&
                 filters.serviceType === 'todos' &&
                 filters.city === 'todos' &&
                 filters.dateRange === 'all'
                  ? 'Todavía no hay solicitudes.'
                  : 'No hay solicitudes con estos filtros.'}
              </p>
            </div>
          ) : (
            <>
              {/* Tabla (desktop) — scroll horizontal cuando no entran las columnas */}
              <div className="hidden md:block bg-white border border-zinc-100 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <th className="text-left   font-bold px-4 py-3">Ref.</th>
                      <th className="text-left   font-bold px-4 py-3">Fecha</th>
                      <th className="text-left   font-bold px-4 py-3">Cliente</th>
                      <th className="text-left   font-bold px-4 py-3">Ciudad</th>
                      <th className="text-left   font-bold px-4 py-3">Tipo</th>
                      <th className="text-right  font-bold px-4 py-3">Personas</th>
                      <th className="text-left   font-bold px-4 py-3">Evento</th>
                      <th className="text-right  font-bold px-4 py-3">Presupuesto</th>
                      <th className="text-left   font-bold px-4 py-3">Estado</th>
                      <th className="text-center font-bold px-4 py-3">Propuestas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = statusChip(r)
                      return (
                        <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500 whitespace-nowrap">{refOf(r.id)}</td>
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-zinc-900 whitespace-nowrap">{r.client_name}</p>
                            {r.client_email && <p className="text-xs text-zinc-400">{r.client_email}</p>}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{r.city ? cityLabel(r.city) : '—'}</td>
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{serviceLabel(r.service_type)}</td>
                          <td className="px-4 py-3 text-right text-zinc-600 tabular-nums">{guestsOf(r)}</td>
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(r.event_date_start)}</td>
                          <td className="px-4 py-3 text-right text-zinc-600 tabular-nums whitespace-nowrap">{budgetOf(r)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block min-w-[1.5rem] text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                              r.proposals_count === 0 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {r.proposals_count}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas (mobile) */}
              <div className="md:hidden space-y-3">
                {rows.map((r) => {
                  const st = statusChip(r)
                  return (
                    <div key={r.id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-zinc-400">{refOf(r.id)}</p>
                          <p className="font-semibold text-zinc-900 text-sm">{r.client_name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {r.city ? cityLabel(r.city) : '—'} · {serviceLabel(r.service_type)} · {guestsOf(r)} pers.
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-3 mt-2">
                        <p className="text-xs text-zinc-400">
                          Solicitado {fmtDate(r.created_at)} · evento {fmtDate(r.event_date_start)}
                          <br />
                          <span className={r.proposals_count === 0 ? 'text-amber-600 font-semibold' : 'text-zinc-500'}>
                            {r.proposals_count} {r.proposals_count === 1 ? 'propuesta' : 'propuestas'}
                          </span>
                        </p>
                        <p className="text-right text-xs font-semibold text-zinc-700 tabular-nums shrink-0">
                          {budgetOf(r)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cargar más */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => load(filters, page + 1, false)}
                    disabled={pending}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {pending ? 'Cargando…' : `Cargar más (${total - rows.length} restantes)`}
                  </button>
                </div>
              )}
            </>
          )}
      </div>
    </section>
  )
}

function StatCard({
  label, value, hint, tone,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'emerald' | 'amber'
}) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`font-serif text-xl font-bold leading-tight mt-1 truncate ${
        tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-zinc-900'
      }`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-zinc-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function FilterSelect({
  value, onChange, options, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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
