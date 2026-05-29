"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Minus } from "lucide-react"
import { acceptProposal } from "../actions"

type PaymentMethod = "card" | "paypal" | "googlepay"

type Props = {
  requestId:   string
  proposalId:  string
  total:       number
}

function fmt(n: number) {
  return n.toLocaleString("es-UY")
}

const FAQ_ITEMS = [
  { q: "¿Qué incluye el servicio?",                          a: "El servicio incluye la preparación completa del menú por el chef en tu domicilio, incluyendo la compra de ingredientes, cocina y presentación de los platos." },
  { q: "¿Qué pasa una vez hago la reserva?",                 a: "Recibirás una confirmación por email. El chef se pondrá en contacto contigo para coordinar los detalles finales del evento." },
  { q: "¿Mi pago es seguro? ¿Cuál es la Política de Garantía?", a: "Sí. El pago está protegido: el chef solo cobra una vez que el servicio se haya completado satisfactoriamente." },
  { q: "¿Puedo hacer cambios después de reservar?",           a: "Puedes cancelar gratuitamente dentro de las 24 horas posteriores a la reserva. Para cambios en el menú, contacta directamente al chef." },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="text-sm text-zinc-800">{q}</span>
        {open
          ? <Minus className="w-5 h-5 text-amber-500 flex-shrink-0" />
          : <Plus  className="w-5 h-5 text-amber-500 flex-shrink-0" />
        }
      </button>
      {open && <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{a}</p>}
    </div>
  )
}

// ── Payment method icons ────────────────────────────────────────────────────────

function CreditCardIcon() {
  return (
    <div className="w-10 h-7 bg-zinc-900 rounded-md flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

function PaypalIcon() {
  return (
    <div className="w-10 h-7 bg-zinc-100 rounded-md flex items-center justify-center flex-shrink-0 px-1">
      <span className="text-[11px] font-bold text-blue-700 leading-none tracking-tight">PayPal</span>
    </div>
  )
}

function GooglePayIcon() {
  return (
    <div className="w-10 h-7 bg-zinc-100 rounded-md flex items-center justify-center flex-shrink-0 px-1">
      <span className="text-[10px] font-bold text-zinc-700 leading-none tracking-tight">G Pay</span>
    </div>
  )
}

const METHODS: { id: PaymentMethod; label: string; Icon: React.FC }[] = [
  { id: "card",      label: "Tarjeta de crédito", Icon: CreditCardIcon },
  { id: "paypal",    label: "Paypal",              Icon: PaypalIcon },
  { id: "googlepay", label: "Google Pay",          Icon: GooglePayIcon },
]

// ── Component ──────────────────────────────────────────────────────────────────

export function PaymentView({ requestId, proposalId, total }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>("card")
  const [isPaying, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const buttonLabel = method === "card" ? "Pagar con tarjeta"
    : method === "paypal"    ? "Pagar con PayPal"
    : "Pagar con Google Pay"

  const handlePay = () => {
    startTransition(async () => {
      const result = await acceptProposal(proposalId, requestId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/client-dashboard/${requestId}/proposals/${proposalId}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Gray top section ──────────────────────────────────────────────────── */}
      <div className="bg-[#f0f0f0] py-8 px-4">
        <div className="max-w-4xl mx-auto flex gap-6 items-start">

          {/* Left card */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl p-6 shadow-sm">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Método de pago
            </button>

            <p className="text-sm font-semibold text-zinc-800 mb-4">Seleccionar método de pago</p>

            <div className="space-y-1">
              {METHODS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white transition-colors"
                >
                  <Icon />
                  <span className="flex-1 text-left text-sm font-medium text-zinc-800">{label}</span>
                  {/* Custom radio */}
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    method === id ? "border-amber-400" : "border-zinc-300"
                  }`}>
                    {method === id && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <h2 className="font-bold text-zinc-900 text-lg mb-4">Finalizar mi pedido</h2>

              <div className="flex justify-between items-baseline mb-5">
                <span className="text-sm text-zinc-600">Total</span>
                <span className="text-xl font-bold text-zinc-900">{fmt(total)} UYU</span>
              </div>

              {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="w-full py-3.5 rounded-full bg-amber-400 hover:bg-amber-500 text-zinc-900 font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPaying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                  : buttonLabel
                }
              </button>

              <div className="flex items-start gap-2 mt-4">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Cancelación gratuita dentro de las 24 horas posteriores a la reserva
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── White FAQ section ─────────────────────────────────────────────────── */}
      <div className="bg-white flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-8">Preguntas frecuentes</h2>
          <div className="grid grid-cols-2 gap-x-16">
            <div>
              {FAQ_ITEMS.filter((_, i) => i % 2 === 0).map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
            <div>
              {FAQ_ITEMS.filter((_, i) => i % 2 !== 0).map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
