'use client'

// ============================================================================
// Panel admin · Comisión de la plataforma
//
// Cambia platform_config.commission_rate (única fuente de verdad, leída por
// create_booking_for_payment al crear cada booking — ver
// MIGRATION_commission_rate_config.sql). Afecta SOLO bookings nuevos a partir
// de acá: los existentes ya tienen su commission_rate/commission_amount/
// chef_payout_amount congelados y no se recalculan.
//
// Doble confirmación por ser una acción con dinero de alcance global (mueve
// todos los bookings futuros, no uno puntual como releasePayout/markRefund):
// un botón "Cambiar" que revela el formulario, y el submit exige PIN.
// ============================================================================

import { useState, useTransition } from 'react'
import { Loader2, Check, ShieldAlert } from 'lucide-react'
import { updateCommissionRate } from './actions'

export function CommissionRateSection({ currentRatePercent }: { currentRatePercent: number }) {
  const [editing, setEditing]   = useState(false)
  const [rate, setRate]         = useState(String(currentRatePercent))
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [isPending, start]      = useTransition()

  const parsed = Number(rate.replace(',', '.'))
  const canConfirm = !isPending && Number.isFinite(parsed) && parsed > 0 && parsed < 100 && pin.trim().length > 0

  const openForm = () => {
    setRate(String(currentRatePercent))
    setPin('')
    setError(null)
    setSuccess(false)
    setEditing(true)
  }

  const run = () => {
    setError(null)
    start(async () => {
      const res = await updateCommissionRate(parsed, pin.trim())
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess(true)
      setEditing(false)
    })
  }

  return (
    <section className="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-zinc-500" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Comisión de la plataforma
        </h2>
      </div>

      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Tasa vigente</p>
        <p className="font-serif text-3xl font-bold text-zinc-900 leading-none mb-3">
          {currentRatePercent}%
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          Se aplica a los bookings creados desde ahora. Los ya existentes conservan la tasa con la que se cobraron.
        </p>

        {success && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mb-3">
            <Check className="w-3.5 h-3.5 shrink-0" />
            Comisión actualizada.
          </p>
        )}

        {!editing ? (
          <button
            type="button"
            onClick={openForm}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-900 transition-colors"
          >
            Cambiar comisión
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Nueva comisión (%)"
                className="w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN de administrador *"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={run}
                disabled={!canConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null) }}
                disabled={isPending}
                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-1"
              >
                Cancelar
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
