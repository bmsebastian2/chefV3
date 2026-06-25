"use client"

import { useState, useTransition } from "react"
import { Loader2, Check } from "lucide-react"
import { releasePayout, markRefund } from "./actions"

type Props = {
  bookingId: string
  kind:      "payout" | "refund"
}

export function ProcessButton({ bookingId, kind }: Props) {
  const [open, setOpen]   = useState(false)
  const [ref, setRef]     = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const cta = kind === "payout" ? "Marcar girado" : "Marcar reembolsado"

  const handle = () => {
    setError(null)
    start(async () => {
      const res = kind === "payout"
        ? await releasePayout(bookingId, ref.trim() || undefined)
        : await markRefund(bookingId, ref.trim() || undefined)
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
        {cta}
      </button>
    )
  }

  return (
    <div className="shrink-0 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Referencia (opcional)"
          className="w-44 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          type="button"
          onClick={handle}
          disabled={isPending}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
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
