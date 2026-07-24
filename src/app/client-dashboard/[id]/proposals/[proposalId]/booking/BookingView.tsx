"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { Stepper } from "@/components/ui/stepper"
import { repriceProposal, MIN_BOOKING_GUESTS, type MenuPrices } from "@/lib/pricing"
import { MAX_EVENT_GUESTS } from "@/components/wizard/types"

type Props = {
  requestId:   string
  proposalId:  string
  chef: {
    name:     string
    photoUrl: string | null
  }
  menu: {
    cuisineType:    string | null
    pricePerPerson: number
    dateStr:        string
  }
  /** Snapshot de precios por bracket del menú; null → el precio queda fijo. */
  snapshot: MenuPrices | null
  /** Comensales del request cuando el chef cotizó — valor inicial del stepper. */
  originalGuests: number
}

// ── Guarantee items ───────────────────────────────────────────────────────────

const GUARANTEES = [
  { title: "Reembolso completo",   desc: "Cancelá hasta 15 días antes de tu evento y recuperá tu dinero." },
  { title: "Seguro y protegido",   desc: "Los chefs solo cobran después de que tu evento esté completo." },
  { title: "Chefs de confianza",   desc: "Profesionales evaluados y calificados por clientes reales." },
  { title: "Siempre aquí para ti", desc: "Soporte al cliente disponible siempre que nos necesités." },
]

// ── Main component ────────────────────────────────────────────────────────────

export function BookingView({ requestId, proposalId, chef, menu, snapshot, originalGuests }: Props) {
  const router  = useRouter()
  const [guests, setGuests] = useState(() =>
    Math.min(MAX_EVENT_GUESTS, Math.max(MIN_BOOKING_GUESTS, originalGuests)),
  )

  // Al mover los comensales, el por-persona salta al precio real del chef para
  // el bracket nuevo (snapshot del menú en la propuesta); sin snapshot queda
  // fijo. Mismo cálculo que cobra el server en create-payment/create-order.
  const perPerson = repriceProposal(menu.pricePerPerson, snapshot, guests)
    ?? menu.pricePerPerson
  const total = perPerson > 0 ? perPerson * guests : null

  const handleFinalize = () => {
    if (!guests) return
    router.push(`/client-dashboard/${requestId}/proposals/${proposalId}/payment?guests=${guests}`)
  }

  return (
    <>
      {/* ── Page ── */}
      <div className="min-h-screen bg-zinc-50 py-6 md:py-8 px-4 pb-32 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-5 md:gap-6 items-start">

          {/* ── Left column (full width on mobile) ── */}
          <div className="flex-1 space-y-4 min-w-0 w-full">

            {/* Main card */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100">

              {/* Back + Chef header */}
              <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-zinc-50">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 mb-4 transition-colors uppercase tracking-[0.1em]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver
                </button>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden bg-zinc-100 flex-shrink-0 border border-zinc-100 shadow-sm">
                    {chef.photoUrl ? (
                      <Image
                        src={chef.photoUrl}
                        alt={chef.name}
                        width={56} height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 font-serif text-xl font-semibold">
                        {chef.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-0.5">
                      Propuesta por
                    </p>
                    <p className="font-serif text-base md:text-lg font-semibold text-zinc-900">
                      Chef {chef.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu + Guests — stacks on mobile */}
              <div className="px-5 md:px-6 py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1.5">Menú</p>
                    {menu.cuisineType && (
                      <p className="text-sm font-semibold text-zinc-800">{menu.cuisineType}</p>
                    )}
                    <p className="text-sm text-zinc-700">
                      <span className="font-bold text-zinc-900">{formatPrice(perPerson)}</span>
                      <span className="text-zinc-400"> / persona</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1.5">Fecha</p>
                    <p className="text-sm font-semibold text-zinc-800">{menu.dateStr}</p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">
                    Comensales
                  </p>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <Stepper
                      value={guests}
                      min={MIN_BOOKING_GUESTS}
                      max={MAX_EVENT_GUESTS}
                      onDecrement={() => setGuests((v) => Math.max(MIN_BOOKING_GUESTS, v - 1))}
                      onIncrement={() => setGuests((v) => Math.min(MAX_EVENT_GUESTS, v + 1))}
                    />
                    <span className="text-sm text-zinc-500">persona{guests !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee card */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-px w-5 bg-accent/60 rounded-full" />
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Garantías GetChef
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {GUARANTEES.map((item) => (
                  <div key={item.title}>
                    <p className="text-xs font-bold text-zinc-700 mb-1">{item.title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
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
                  <span className="text-xs text-zinc-500">
                    {guests > 0 ? `${guests} × ${formatPrice(perPerson)}` : "Total"}
                  </span>
                  <span className="font-serif text-xl font-bold text-zinc-900">
                    {total !== null ? formatPrice(total) : "—"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={!guests}
                  className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Finalizar pedido
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

      {/* ── Mobile fixed bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-zinc-100 shadow-2xl px-4 py-3">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">Total</p>
            <p className="font-serif text-lg font-bold text-zinc-900 leading-none mt-0.5">
              {total !== null ? formatPrice(total) : "—"}
            </p>
            {guests > 0 && (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {guests} persona{guests !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={!guests}
            className="flex-shrink-0 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            Finalizar
          </button>
        </div>
      </div>
    </>
  )
}
