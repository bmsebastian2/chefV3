"use client"

import { useState, useTransition } from "react"
import { Loader2, Check, AlertTriangle } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { releasePayout, markRefund, markOrphanRefund } from "./actions"

type Kind = "payout" | "refund" | "orphan"

type Props = {
  // bookingId para payout/refund; paymentId para orphan.
  id:     string
  kind:   Kind
  amount?: number | null
  // Solo para payout: si el chef NO tiene datos bancarios cargados, se advierte
  // pero NO se bloquea — el giro se hace por fuera y el admin puede tener los
  // datos por otro canal.
  hasPayoutAccount?: boolean
}

// Toda acción con dinero exige la referencia del giro: no se marca plata como
// movida sin constancia del movimiento real.
const CTA: Record<Kind, string> = {
  payout: "Marcar girado",
  refund: "Marcar reembolsado",
  orphan: "Marcar reembolsado",
}

export function ProcessButton({ id, kind, amount, hasPayoutAccount }: Props) {
  const [open, setOpen]   = useState(false)
  const [ref, setRef]     = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const trimmed = ref.trim()
  const canConfirm = !isPending && trimmed.length > 0
  const missingAccount = kind === "payout" && hasPayoutAccount === false

  const run = () => {
    setError(null)
    start(async () => {
      const res =
        kind === "payout" ? await releasePayout(id, trimmed)
      : kind === "orphan" ? await markOrphanRefund(id, trimmed)
      :                     await markRefund(id, trimmed)
      // En éxito, la fila desaparece por el revalidatePath('/admin').
      if (res.error) setError(res.error)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
          kind === "payout" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
        }`}
      >
        {CTA[kind]}
      </button>
    )
  }

  return (
    <div className="shrink-0 w-full sm:w-auto">
      {/* Confirmación explícita: acción con dinero. */}
      <p className="text-xs text-zinc-500 mb-1.5">
        {kind === "payout" ? "Confirmá el giro al chef" : "Confirmá el reembolso al cliente"}
        {amount != null && <> de <span className="font-semibold text-zinc-700">{formatPrice(amount)}</span></>}.
        {kind === "payout"
          ? " El número de transferencia es obligatorio y no se puede volver a marcar."
          : " La referencia del giro es obligatoria."}
      </p>

      {/* Advertencia, no bloqueo: el giro se hace por fuera. */}
      {missingAccount && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>Este chef no cargó sus datos bancarios. Marcá el giro solo si ya lo hiciste por otro medio.</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={kind === "payout" ? "N° de transferencia o depósito *" : "Referencia del giro *"}
          className="w-44 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          type="button"
          onClick={run}
          disabled={!canConfirm}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
