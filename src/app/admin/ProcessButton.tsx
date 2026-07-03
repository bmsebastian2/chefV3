"use client"

import { useState, useTransition } from "react"
import { Loader2, Check } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { releasePayout, markRefund, markOrphanRefund } from "./actions"

type Kind = "payout" | "refund" | "orphan"

type Props = {
  // bookingId para payout/refund; paymentId para orphan.
  id:     string
  kind:   Kind
  amount?: number | null
}

// Los reembolsos exigen referencia del giro (no marcar "reembolsado" sin constancia
// del giro real). El payout la deja opcional (comportamiento previo).
const CTA: Record<Kind, string> = {
  payout: "Marcar girado",
  refund: "Marcar reembolsado",
  orphan: "Marcar reembolsado",
}

export function ProcessButton({ id, kind, amount }: Props) {
  const [open, setOpen]   = useState(false)
  const [ref, setRef]     = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const refRequired = kind !== "payout"
  const trimmed = ref.trim()
  const canConfirm = !isPending && (!refRequired || trimmed.length > 0)

  const run = () => {
    setError(null)
    start(async () => {
      const res =
        kind === "payout" ? await releasePayout(id, trimmed || undefined)
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
        {refRequired && " La referencia del giro es obligatoria."}
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={refRequired ? "Referencia del giro *" : "Referencia (opcional)"}
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
