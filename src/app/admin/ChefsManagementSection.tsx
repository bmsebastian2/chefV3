'use client'

// ============================================================================
// Panel admin · Gestión de chefs (LAZY)
//
// Vive en la pestaña "Chefs". AdminTabs monta este componente recién al abrir
// esa pestaña → la carga (al montarse) es el disparador lazy.
//
// Muestra el estado de cada chef (Activo / Inactivo / Bloqueado), sus datos y el
// número de cuenta (sensible, solo admin), y permite bloquear/desbloquear con
// confirmación + motivo. El bloqueo es de nivel admin: separado de is_active y el
// chef no puede revertirlo. Tipos derivados de la server action.
// ============================================================================

import { useState, useEffect, useTransition } from 'react'
import { Users, ShieldAlert, ShieldCheck, Ban, AlertCircle, CreditCard, Undo2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { getChefsForAdmin, setChefBlock, cancelChefBookingsAndRefund } from './actions'

type ChefRow = NonNullable<Awaited<ReturnType<typeof getChefsForAdmin>>['data']>[number]

// Estado visible: el bloqueo admin gana sobre is_active.
function chefState(c: ChefRow): { label: string; chip: string } {
  if (c.admin_blocked) return { label: 'Bloqueado', chip: 'bg-red-100 text-red-700' }
  if (c.is_active)     return { label: 'Activo',    chip: 'bg-emerald-100 text-emerald-700' }
  return { label: 'Inactivo', chip: 'bg-zinc-100 text-zinc-500' }
}

function accountLine(c: ChefRow): string | null {
  const p = c.payout
  if (!p || !(p.account_number || p.bank_name || p.account_holder)) return null
  return [p.bank_name, p.account_number].filter(Boolean).join(' · ')
}

export function ChefsManagementSection() {
  const [chefs, setChefs]   = useState<ChefRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Diálogo de confirmación de bloqueo/desbloqueo.
  const [dialog, setDialog] = useState<{ chef: ChefRow; block: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Diálogo de cancelación masiva (chef bloqueado con reservas activas). Acción
  // separada y explícita: nunca se dispara sola al bloquear.
  const [cancelDialog, setCancelDialog] = useState<ChefRow | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelActing, setCancelActing] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelResult, setCancelResult] = useState<{ cancelled: number; failed: number } | null>(null)

  function load() {
    setError(null)
    startTransition(async () => {
      const res = await getChefsForAdmin()
      if (res.error || !res.data) {
        setError(res.error ?? 'No se pudieron cargar los chefs')
        return
      }
      setChefs(res.data)
      setLoaded(true)
    })
  }

  // Carga lazy al montarse (la pestaña se abrió por primera vez).
  useEffect(() => {
    load()
  }, [])

  function openDialog(chef: ChefRow, block: boolean) {
    setReason('')
    setActionError(null)
    setDialog({ chef, block })
  }

  async function confirmAction() {
    if (!dialog) return
    setActing(true)
    setActionError(null)
    const res = await setChefBlock(dialog.chef.chef_id, dialog.block, reason.trim() || undefined)
    setActing(false)
    if (res.error) {
      setActionError(res.error)
      return
    }
    setDialog(null)
    load() // refrescar estados
  }

  function openCancelDialog(chef: ChefRow) {
    setCancelReason('')
    setCancelError(null)
    setCancelResult(null)
    setCancelDialog(chef)
  }

  async function confirmCancel() {
    if (!cancelDialog) return
    setCancelActing(true)
    setCancelError(null)
    const res = await cancelChefBookingsAndRefund(cancelDialog.chef_id, cancelReason.trim())
    setCancelActing(false)
    if (res.error) {
      setCancelError(res.error)
      return
    }
    setCancelResult({ cancelled: res.cancelled ?? 0, failed: res.failed ?? 0 })
    load() // refrescar conteos de reservas activas
  }

  const total   = chefs.length
  const active  = chefs.filter((c) => c.is_active && !c.admin_blocked).length
  const blocked = chefs.filter((c) => c.admin_blocked).length
  const firstLoad = pending && !loaded

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-4 h-4 text-zinc-600" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Gestión de chefs
        </h2>
      </div>

      {/* Resumen */}
      {loaded && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Chefs" value={total} />
          <StatCard label="Activos" value={active} tone="emerald" />
          <StatCard label="Bloqueados" value={blocked} tone="red" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {firstLoad ? (
        <RowsSkeleton />
      ) : chefs.length === 0 && loaded ? (
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
          <Users className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Todavía no hay chefs registrados.</p>
        </div>
      ) : (
        <>
          {/* Tabla (desktop) */}
          <div className="hidden md:block bg-white border border-zinc-100 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="text-left   font-bold px-4 py-3">Chef</th>
                  <th className="text-left   font-bold px-4 py-3">Ciudad</th>
                  <th className="text-right  font-bold px-4 py-3">Exp.</th>
                  <th className="text-left   font-bold px-4 py-3">Estado</th>
                  <th className="text-left   font-bold px-4 py-3">Cuenta de pago</th>
                  <th className="text-right  font-bold px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {chefs.map((c) => {
                  const st = chefState(c)
                  const acct = accountLine(c)
                  return (
                    <tr key={c.chef_id} className="border-b border-zinc-50 last:border-0 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900 whitespace-nowrap">{c.full_name}</p>
                        {c.email && <p className="text-xs text-zinc-400">{c.email}</p>}
                        {c.phone && <p className="text-xs text-zinc-400">{c.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{c.city ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums whitespace-nowrap">
                        {c.experience_years != null ? `${c.experience_years} a` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>
                          {st.label}
                        </span>
                        {c.admin_blocked && c.admin_block_reason && (
                          <p className="text-[11px] text-zinc-400 mt-1 max-w-[14rem]">{c.admin_block_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {acct ? (
                          <>
                            <p className="font-mono text-xs text-zinc-700">{acct}</p>
                            {c.payout?.account_holder && (
                              <p className="text-[11px] text-zinc-400">{c.payout.account_holder}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-zinc-300">Sin datos</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <BlockButton blocked={c.admin_blocked} onClick={() => openDialog(c, !c.admin_blocked)} />
                          {c.admin_blocked && c.active_bookings_count > 0 && (
                            <button
                              type="button"
                              onClick={() => openCancelDialog(c)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              Cancelar reservas ({c.active_bookings_count})
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (mobile) */}
          <div className="md:hidden space-y-3">
            {chefs.map((c) => {
              const st = chefState(c)
              const acct = accountLine(c)
              return (
                <div key={c.chef_id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm">{c.full_name}</p>
                      {c.email && <p className="text-xs text-zinc-400 mt-0.5">{c.email}</p>}
                      <p className="text-xs text-zinc-400">{c.city ?? '—'}{c.phone && <> · {c.phone}</>}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${st.chip}`}>
                      {st.label}
                    </span>
                  </div>
                  {c.admin_blocked && c.admin_block_reason && (
                    <p className="text-[11px] text-zinc-500 mt-2">Motivo: {c.admin_block_reason}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                    {acct ? <span className="font-mono">{acct}</span> : <span className="text-zinc-300">Sin datos de cuenta</span>}
                  </div>
                  <div className="mt-3">
                    <BlockButton blocked={c.admin_blocked} onClick={() => openDialog(c, !c.admin_blocked)} full />
                  </div>
                  {c.admin_blocked && c.active_bookings_count > 0 && (
                    <button
                      type="button"
                      onClick={() => openCancelDialog(c)}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Cancelar reservas ({c.active_bookings_count})
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Diálogo de confirmación */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2.5 mb-3">
              {dialog.block
                ? <ShieldAlert className="w-5 h-5 text-red-600" />
                : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              <h3 className="font-serif text-lg font-semibold text-zinc-900">
                {dialog.block ? 'Deshabilitar chef' : 'Rehabilitar chef'}
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              {dialog.block ? (
                <>
                  <span className="font-medium text-zinc-700">{dialog.chef.full_name}</span> no podrá trabajar:
                  no recibirá solicitudes, no aparecerá públicamente ni podrá enviar propuestas, hasta que lo
                  rehabilites. El chef no puede revertir esto por su cuenta.
                </>
              ) : (
                <>
                  <span className="font-medium text-zinc-700">{dialog.chef.full_name}</span> volverá a operar
                  normalmente (si su perfil está activo).
                </>
              )}
            </p>

            {dialog.block && dialog.chef.active_bookings_count > 0 && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  Este chef tiene <strong>{dialog.chef.active_bookings_count}</strong> reserva
                  {dialog.chef.active_bookings_count !== 1 ? 's' : ''} confirmada
                  {dialog.chef.active_bookings_count !== 1 ? 's' : ''}
                  {' '}({formatPrice(dialog.chef.active_bookings_amount)}). El bloqueo no las cancela — se
                  siguen honrando salvo que decidas cancelarlas explícitamente después.
                </p>
              </div>
            )}

            {dialog.block && (
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Motivo (opcional, queda registrado)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Ej: incumplimiento de términos…"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                />
              </div>
            )}

            {actionError && (
              <p className="text-sm text-red-600 mb-3">{actionError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                disabled={acting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={acting}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors ${
                  dialog.block ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {acting ? 'Aplicando…' : dialog.block ? 'Deshabilitar' : 'Rehabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de cancelación masiva — acción sobre dinero de clientes */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Undo2 className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif text-lg font-semibold text-zinc-900">
                Cancelar y reembolsar reservas
              </h3>
            </div>

            {cancelResult ? (
              <>
                <p className="text-sm text-zinc-600 mb-5">
                  {cancelResult.cancelled} reserva{cancelResult.cancelled !== 1 ? 's' : ''} cancelada
                  {cancelResult.cancelled !== 1 ? 's' : ''} y enviada{cancelResult.cancelled !== 1 ? 's' : ''} a
                  reembolsos pendientes.
                  {cancelResult.failed > 0 && (
                    <span className="block mt-1.5 text-red-600 font-medium">
                      {cancelResult.failed} no se pudo{cancelResult.failed !== 1 ? 'ieron' : ''} cancelar — revisá
                      el panel de reembolsos.
                    </span>
                  )}
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCancelDialog(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
                  >
                    Listo
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500 mb-4">
                  Vas a cancelar las <span className="font-semibold text-zinc-700">
                    {cancelDialog.active_bookings_count}
                  </span> reserva{cancelDialog.active_bookings_count !== 1 ? 's' : ''} confirmada
                  {cancelDialog.active_bookings_count !== 1 ? 's' : ''} de{' '}
                  <span className="font-medium text-zinc-700">{cancelDialog.full_name}</span> —{' '}
                  <span className="font-semibold text-amber-700">
                    {formatPrice(cancelDialog.active_bookings_amount)}
                  </span>{' '}
                  quedarán a reembolsar a los clientes. Esta acción no se puede deshacer.
                </p>

                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Motivo (obligatorio, queda registrado)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Ej: cuenta deshabilitada por incumplimiento…"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                  />
                </div>

                {cancelError && (
                  <p className="text-sm text-red-600 mb-3">{cancelError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelDialog(null)}
                    disabled={cancelActing}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmCancel}
                    disabled={cancelActing || !cancelReason.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelActing ? 'Cancelando…' : 'Cancelar reservas y reembolsar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function BlockButton({ blocked, onClick, full }: { blocked: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${full ? 'w-full' : ''} ${
        blocked
          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          : 'text-red-700 bg-red-50 hover:bg-red-100'
      }`}
    >
      {blocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
      {blocked ? 'Rehabilitar' : 'Deshabilitar'}
    </button>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'red' }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`font-serif text-xl font-bold leading-none mt-1 ${
        tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-zinc-900'
      }`}>
        {value}
      </p>
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
          <div className="h-7 w-24 bg-zinc-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  )
}
