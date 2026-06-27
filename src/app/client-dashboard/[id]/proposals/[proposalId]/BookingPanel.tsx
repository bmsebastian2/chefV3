"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2, XCircle, Star, ShieldCheck, Loader2, X,
} from "lucide-react"
import { completeBooking, cancelBooking, submitReview } from "./actions"

type Props = {
  bookingId:     string
  requestId:     string
  bookingStatus: string          // 'confirmed' | 'completed' | 'cancelled'
  hasReview:     boolean
  chefName:      string
  serviceDate:   string          // 'YYYY-MM-DD' — fecha de referencia del servicio
}

// ── Star rating row ──────────────────────────────────────────────────────────

function StarRow({
  label, value, onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || value) >= n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              className="p-0.5"
              aria-label={`${label}: ${n}`}
            >
              <Star className={`w-5 h-5 transition-colors ${active ? "text-amber-400 fill-amber-400" : "text-zinc-300"}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Review modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  bookingId, requestId, chefName, onClose, onDone,
}: {
  bookingId: string
  requestId: string
  chefName:  string
  onClose:   () => void
  onDone:    () => void
}) {
  const [chef, setChef] = useState(0)
  const [food, setFood] = useState(0)
  const [presentation, setPresentation] = useState(0)
  const [cleanliness, setCleanliness] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const complete = chef > 0 && food > 0 && presentation > 0 && cleanliness > 0

  const handleSubmit = () => {
    if (!complete || isPending) return
    setError(null)
    startTransition(async () => {
      const res = await submitReview(
        bookingId, requestId,
        { chef, food, presentation, cleanliness },
        comment.trim() || undefined,
      )
      if (res.error) setError(res.error)
      else onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-100 p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-serif text-xl font-semibold text-zinc-900 mb-1">
          Reseñá tu experiencia
        </h3>
        <p className="text-sm text-zinc-500 mb-6">Con el Chef {chefName}</p>

        <div className="space-y-3.5 mb-5">
          <StarRow label="Chef"         value={chef}         onChange={setChef} />
          <StarRow label="Comida"       value={food}         onChange={setFood} />
          <StarRow label="Presentación" value={presentation} onChange={setPresentation} />
          <StarRow label="Limpieza"     value={cleanliness}  onChange={setCleanliness} />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Contanos cómo fue tu experiencia (opcional)"
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors mb-4"
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!complete || isPending}
          className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Enviando..." : "Enviar reseña"}
        </button>
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function BookingPanel({ bookingId, requestId, bookingStatus, hasReview, chefName, serviceDate }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(bookingStatus)

  // El servicio solo puede marcarse como completado una vez que su fecha llegó o
  // pasó. Comparamos en la zona horaria local del navegador (la real del cliente):
  // medianoche del día del servicio vs. ahora. El guard server-side (complete_booking)
  // es la protección real; esto es UX para no ofrecer una acción que será rechazada.
  const serviceDay  = new Date(serviceDate + "T00:00:00")
  const serviceOccurred = serviceDay.getTime() <= Date.now()
  const serviceDateLabel = serviceDay.toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  })
  const [reviewed, setReviewed] = useState(hasReview)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompleting, startComplete] = useTransition()
  const [isCancelling, startCancel] = useTransition()

  const handleComplete = () => {
    if (!serviceOccurred) return
    setError(null)
    startComplete(async () => {
      const res = await completeBooking(bookingId, requestId)
      if (res.error) setError(res.error)
      else { setStatus("completed"); router.refresh() }
    })
  }

  const handleCancel = () => {
    setError(null)
    startCancel(async () => {
      const res = await cancelBooking(bookingId, requestId)
      if (res.error) { setError(res.error); setConfirmCancel(false) }
      else { setStatus("cancelled"); router.refresh() }
    })
  }

  // ── Cancelled ──
  if (status === "cancelled") {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          <p className="text-sm font-semibold">Reserva cancelada</p>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5">
          Si corresponde un reembolso, lo procesaremos en los próximos días.
        </p>
      </div>
    )
  }

  // ── Completed ──
  if (status === "completed") {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-emerald-600 mb-3">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-sm font-semibold">Servicio completado</p>
        </div>

        {reviewed ? (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Reseña enviada ¡gracias!
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500 mb-3">
              ¿Cómo fue tu experiencia? Tu reseña ayuda a otros clientes.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Dejar reseña
            </button>
          </>
        )}

        {modalOpen && (
          <ReviewModal
            bookingId={bookingId}
            requestId={requestId}
            chefName={chefName}
            onClose={() => setModalOpen(false)}
            onDone={() => { setModalOpen(false); setReviewed(true); router.refresh() }}
          />
        )}
      </div>
    )
  }

  // ── Confirmed (default) ──
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-emerald-600 mb-1">
        <ShieldCheck className="w-4 h-4" />
        <p className="text-sm font-semibold">Reserva confirmada</p>
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        Tu pago está protegido. El chef cobra recién cuando el servicio se completa.
      </p>

      <button
        type="button"
        onClick={handleComplete}
        disabled={isCompleting || !serviceOccurred}
        title={!serviceOccurred ? `Podrás marcar como completado a partir del ${serviceDateLabel}` : undefined}
        className="w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-2"
      >
        {isCompleting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isCompleting ? "Confirmando..." : "Marcar como completado"}
      </button>

      {!serviceOccurred && (
        <p className="text-xs text-zinc-400 mb-2 text-center">
          Podrás marcarlo como completado a partir del {serviceDateLabel}.
        </p>
      )}

      {confirmCancel ? (
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 mt-2">
          <p className="text-xs text-zinc-600 mb-2.5">
            ¿Seguro que querés cancelar? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sí, cancelar
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              disabled={isCancelling}
              className="flex-1 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 font-semibold text-xs hover:bg-zinc-50 transition-colors"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setError(null); setConfirmCancel(true) }}
          className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-red-600 transition-colors"
        >
          Cancelar reserva
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
