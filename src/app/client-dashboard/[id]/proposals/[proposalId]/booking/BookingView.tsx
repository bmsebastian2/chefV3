"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown } from "lucide-react"

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
  maxGuests: number
}

function fmt(n: number) {
  return n.toLocaleString("es-UY")
}

function GuestDropdown({
  value,
  onChange,
  maxGuests,
}: {
  value: number | ""
  onChange: (v: number | "") => void
  maxGuests: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const options = Array.from({ length: Math.max(1, maxGuests - 1) }, (_, i) => i + 2)
  const label = value ? `${value} personas` : "Seleccionar"

  return (
    <div ref={ref} className="relative min-w-[175px]">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-medium text-sm hover:border-zinc-400 transition-colors"
      >
        {label}
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-20 overflow-hidden">
          {/* Seleccionar placeholder */}
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            Seleccionar
          </button>

          {options.map((n) => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => { onChange(n); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-blue-600 text-white"
                    : "text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {n} personas
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BookingView({ requestId, proposalId, chef, menu, maxGuests }: Props) {
  const router = useRouter()
  const [guests, setGuests] = useState<number | "">(2)

  const total = typeof guests === "number" && guests > 0 ? menu.pricePerPerson * guests : null

  const handleFinalize = () => {
    if (!guests) return
    router.push(`/client-dashboard/${requestId}/proposals/${proposalId}/payment?guests=${guests}`)
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] py-8 px-4">
      <div className="max-w-4xl mx-auto flex gap-6 items-start">

        {/* ── Left column ──────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Main card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Back */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Mi reserva
            </button>

            {/* Chef */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-200 flex-shrink-0 ring-2 ring-white shadow-sm">
                {chef.photoUrl ? (
                  <Image src={chef.photoUrl} alt={chef.name} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                    {chef.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
                  Propuesta por
                </p>
                <p className="text-zinc-900 font-medium">
                  Chef <strong>{chef.name}</strong>
                </p>
              </div>
            </div>

            {/* Menu + Guest count row */}
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Menú</p>
                  {menu.cuisineType && (
                    <p className="text-zinc-900 font-semibold">{menu.cuisineType}</p>
                  )}
                  <p className="text-zinc-900 font-semibold">
                    {fmt(menu.pricePerPerson)} UYU
                    <span className="text-sm font-normal text-zinc-500"> / persona</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Fecha</p>
                  <p className="text-zinc-900 font-semibold">{menu.dateStr}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  Número de comensales
                </p>
                <GuestDropdown value={guests} onChange={setGuests} maxGuests={maxGuests} />
              </div>
            </div>
          </div>

          {/* Guarantee card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="font-bold text-zinc-900 uppercase tracking-widest text-xs">
                Garantía de Take a Chef
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {[
                { title: "Reembolso completo",   desc: "Cancela hasta 15 días antes de tu evento y recupera tu dinero." },
                { title: "Seguro y protegido",   desc: "Los chefs solo se pagan después de que su evento esté completo." },
                { title: "Chefs de confianza",   desc: "Profesionales evaluados, revisados por huéspedes reales." },
                { title: "Siempre aquí para ti", desc: "Soporte al cliente 24/7, siempre que nos necesites." },
              ].map((item) => (
                <div key={item.title}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{item.title}</p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0">
          <div className="sticky top-8 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
            <h2 className="font-bold text-zinc-900 text-lg mb-4">Ir al pago</h2>

            <div className="flex justify-between items-baseline mb-5">
              <span className="text-sm text-zinc-600">Total</span>
              <span className="text-xl font-bold text-zinc-900">
                {total !== null ? `${fmt(total)} UYU` : "—"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={!guests}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-900 font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Finalizar pedido
            </button>

            <div className="flex items-start gap-2 mt-4">
              <svg
                className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
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
  )
}
