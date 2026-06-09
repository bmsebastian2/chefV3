"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Minus, ShieldCheck } from "lucide-react"

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
  { q: "¿Qué incluye el servicio?",                             a: "El servicio incluye la preparación completa del menú por el chef en tu domicilio, incluyendo la compra de ingredientes, cocina y presentación de los platos." },
  { q: "¿Qué pasa una vez hago la reserva?",                    a: "Recibirás una confirmación por email. El chef se pondrá en contacto contigo para coordinar los detalles finales del evento." },
  { q: "¿Mi pago es seguro? ¿Cuál es la Política de Garantía?", a: "Sí. El pago está protegido: el chef solo cobra una vez que el servicio se haya completado satisfactoriamente." },
  { q: "¿Puedo hacer cambios después de reservar?",             a: "Podés cancelar gratuitamente dentro de las 24 horas posteriores a la reserva. Para cambios en el menú, contactá directamente al chef." },
]

// ── FAQ accordion ─────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-100 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <span className="text-sm font-medium text-zinc-800 leading-snug">{q}</span>
        {open
          ? <Minus className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          : <Plus  className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        }
      </button>
      {open && <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{a}</p>}
    </div>
  )
}

// ── Payment method icons ──────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function PaymentView({ requestId, proposalId, total }: Props) {
  const router = useRouter()
  const [method, setMethod]   = useState<PaymentMethod>("card")
  const [isPaying, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)

  const buttonLabel = method === "card"      ? "Pagar con tarjeta"
    : method === "paypal"                    ? "Pagar con PayPal"
    : "Pagar con Google Pay"

  const handlePay = () => {
    if (method !== "card") {
      setError("Método de pago no disponible aún")
      return
    }
    startTransition(async () => {
      setError(null)
      const res = await fetch("/api/dlocalgo/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, currency: "UYU", proposalId, requestId }),
      })
      let data: { redirect_url?: string; error?: string } = {}
      try {
        data = await res.json()
      } catch {
        setError("Error al conectar con el servidor de pagos")
        return
      }
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else {
        setError(data.error ?? "Error al iniciar el pago")
      }
    })
  }

  return (
    <>
      <div className="min-h-screen flex flex-col pb-28 md:pb-0">

        {/* ── Top section ── */}
        <div className="bg-zinc-50 py-6 md:py-8 px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-5 md:gap-6 items-start">

            {/* ── Left: payment methods (full width on mobile) ── */}
            <div className="flex-1 min-w-0 w-full bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 mb-5 transition-colors uppercase tracking-[0.1em]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver
              </button>

              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-px w-5 bg-accent/60 rounded-full" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Método de pago
                </p>
              </div>

              <div className="space-y-2">
                {METHODS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                      method === id
                        ? "border-accent bg-accent/5"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <Icon />
                    <span className="flex-1 text-left text-sm font-medium text-zinc-800">{label}</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      method === id ? "border-accent" : "border-zinc-300"
                    }`}>
                      {method === id && <span className="w-2 h-2 rounded-full bg-accent" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right sidebar — desktop only ── */}
            <div className="hidden md:block w-72 flex-shrink-0">
              <div className="sticky top-8 bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
                <div className="px-5 pt-5 pb-4 border-b border-zinc-50">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-px w-5 bg-accent/60 rounded-full" />
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      Resumen
                    </h2>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-500">Total</span>
                    <span className="font-serif text-xl font-bold text-zinc-900">{fmt(total)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 text-right mt-0.5">UYU</p>
                </div>

                <div className="p-5">
                  {error && (
                    <p className="text-xs text-red-500 mb-3 text-center">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={isPaying}
                    className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isPaying
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
                      : buttonLabel
                    }
                  </button>
                  <div className="flex items-start gap-2 mt-4">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Cancelación gratuita dentro de las 24 h posteriores a la reserva
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── FAQ section ── */}
        <div className="bg-white flex-1 py-10 md:py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-xl md:text-2xl font-semibold text-zinc-900 text-center mb-8">
              Preguntas frecuentes
            </h2>
            {/* Single column on mobile, two columns on desktop */}
            <div className="block md:hidden">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
            <div className="hidden md:grid grid-cols-2 gap-x-16">
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

      {/* ── Mobile fixed bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-zinc-100 shadow-2xl px-4 py-3">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Total</p>
            <p className="font-serif text-lg font-bold text-zinc-900 leading-none mt-0.5">
              {fmt(total)} UYU
            </p>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={isPaying}
            className="flex-shrink-0 px-6 py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            {isPaying
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
              : "Pagar"
            }
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 text-center mt-1.5">{error}</p>
        )}
      </div>
    </>
  )
}
