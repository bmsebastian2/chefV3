"use client"

import { useState, useTransition } from "react"
import { Loader2, RefreshCw, Check } from "lucide-react"
import { reconcilePendingPayments } from "./actions"

/**
 * Dispara la reconciliación de pagos 'pending' colgados: le pregunta a la
 * pasarela el estado real de cada uno y aplica el resultado. Útil para limpiar
 * el ruido de pagos abandonados que ningún otro camino re-consulta.
 */
export function ReconcilePendingButton() {
  const [isPending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError]   = useState<string | null>(null)

  const run = () => {
    setResult(null)
    setError(null)
    start(async () => {
      const res = await reconcilePendingPayments()
      if (res.error) {
        setError(res.error)
        return
      }
      const n = res.reconciled ?? 0
      setResult(n === 0 ? "Sin cambios" : `${n} ${n === 1 ? "pago actualizado" : "pagos actualizados"}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        title="Consulta a la pasarela el estado real de los pagos pendientes y actualiza los que quedaron colgados"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />}
        Reconciliar pendientes
      </button>
      {result && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <Check className="w-3.5 h-3.5" /> {result}
        </span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
