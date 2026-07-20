"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

type Provider = "dlocalgo" | "paypal" | string

type Props = {
  provider:  Provider | null
  /** Order id / payment id de la pasarela (payments.dlocalgo_payment_id). */
  orderId:   string | null
  /** Solo PayPal: id de la captura. Es el ÚNICO con el que PayPal deja reembolsar. */
  captureId: string | null
  /**
   * Modo compacto: solo el badge de la pasarela, con el id en el tooltip.
   * Para la tabla de ciclo completo, que ya tiene 10 columnas y una sticky:
   * ahí el admin ESCANEA (le alcanza saber de qué pasarela es) y el id completo
   * con copiado vive en la lista de reembolsos, que es donde ACTÚA.
   */
  compact?: boolean
}

const LABEL: Record<string, string> = {
  dlocalgo: "dLocalGo",
  paypal:   "PayPal",
}

const STYLE: Record<string, string> = {
  dlocalgo: "bg-sky-100 text-sky-700",
  paypal:   "bg-indigo-100 text-indigo-700",
}

/**
 * Identifica el cobro para que el admin pueda ir a reembolsarlo: badge de la
 * pasarela + el id con el que se busca la transacción ALLÁ.
 *
 * El id que se muestra NO es siempre el mismo campo:
 *   · dLocalGo → el payment id (dlocalgo_payment_id)
 *   · PayPal   → el CAPTURE id. Mostrar el order id sería darle un dato con el
 *                que PayPal no lo deja reembolsar (el refund va contra la
 *                captura: POST /v2/payments/captures/{capture_id}/refund).
 */
export function PaymentRefChip({ provider, orderId, captureId, compact = false }: Props) {
  const [copied, setCopied] = useState(false)

  const key      = provider ?? "dlocalgo"
  const isPaypal = key === "paypal"

  // Para PayPal el capture id manda; si todavía no llegó (pago sin confirmar),
  // se cae al order id para que el admin no se quede sin NINGUNA referencia.
  const ref = isPaypal ? (captureId ?? orderId) : orderId
  if (!ref) return null

  const badgeClass = `text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STYLE[key] ?? "bg-zinc-100 text-zinc-600"}`

  if (compact) {
    return (
      <span className={`inline-block ${badgeClass}`} title={ref}>
        {LABEL[key] ?? key}
      </span>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard bloqueado (contexto no seguro / permiso denegado): el id
      // igual se ve en pantalla y se puede seleccionar a mano.
    }
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={badgeClass}>{LABEL[key] ?? key}</span>
      <button
        type="button"
        onClick={copy}
        title={
          isPaypal && !captureId
            ? "Order id (la captura todavía no fue confirmada) — clic para copiar"
            : "Clic para copiar"
        }
        className="group flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-700 transition-colors max-w-[220px]"
      >
        <span className="truncate">{ref}</span>
        {copied
          ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          : <Copy  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        }
      </button>
      {/* Aviso explícito: sin capture id, ese reembolso no se puede procesar en
          PayPal todavía. Mejor que el admin lo sepa acá y no en el panel. */}
      {isPaypal && !captureId && (
        <span className="text-[9px] font-semibold text-amber-600">sin captura</span>
      )}
    </div>
  )
}
