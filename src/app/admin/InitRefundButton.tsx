"use client"

import { useState, useTransition } from "react"
import { Loader2, Check } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { initRefund } from "./actions"

// Inicia un reembolso sobre un booking con dinero retenido (escrow_held): lo cancela
// → queda 'refund_pending' y pasa a la lista de reembolsos a procesar. Acción con
// dinero: pide motivo obligatorio y confirma con el monto a la vista.
export function InitRefundButton({
  bookingId,
  amount,
}: {
  bookingId: string
  amount:    number | null
}) {
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError]   = useState<string | null>(null)
  const [isPending, start]  = useTransition()

  const trimmed = reason.trim()
  const canConfirm = !isPending && trimmed.length > 0

  const run = () => {
    setError(null)
    start(async () => {
      const res = await initRefund(bookingId, trimmed)
      if (res.error) setError(res.error)
      // En éxito, la fila cambia de estado por el revalidatePath('/admin').
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap"
      >
        Iniciar reembolso
      </button>
    )
  }

  return (
    <div className="w-full">
      <p className="text-xs text-zinc-500 mb-1.5">
        Vas a <span className="font-semibold text-amber-700">cancelar la reserva</span> y dejar
        {amount != null && <> <span className="font-semibold text-zinc-700">{formatPrice(amount)}</span></>} a reembolsar. Indicá el motivo.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo *"
          className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          type="button"
          onClick={run}
          disabled={!canConfirm}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Confirmar"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          disabled={isPending}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-1"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}
