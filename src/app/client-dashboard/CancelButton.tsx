'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import { cancelRequest } from './actions'

const REASONS = [
  'Nos hemos decidido por otro plan',
  'Posponemos el servicio',
  'Es demasiado caro',
  'Otro motivo',
]

export function CancelButton({
  requestId,
  onCancelled,
}: {
  requestId: string
  onCancelled?: (id: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!reason) return
    startTransition(async () => {
      const result = await cancelRequest(requestId, reason)
      if (!result.error) {
        setOpen(false)
        onCancelled?.(requestId)
      }
    })
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
    setReason('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Cancelar solicitud"
        className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 hover:scale-110 hover:rotate-6 active:scale-95 transition-all duration-200 ease-out"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-semibold text-zinc-900 text-center mb-6">
              Cancelar solicitud
            </h2>

            <div className="space-y-3 mb-8">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    transition-colors duration-150
                    ${reason === r
                      ? 'border-accent bg-accent'
                      : 'border-zinc-300 group-hover:border-zinc-400'}
                  `}>
                    {reason === r && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name={`cancel-reason-${requestId}`}
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="sr-only"
                  />
                  <span className="text-sm text-zinc-700">{r}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 py-3 rounded-full border border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors disabled:opacity-40"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={!reason || isPending}
                className="flex-1 py-3 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
