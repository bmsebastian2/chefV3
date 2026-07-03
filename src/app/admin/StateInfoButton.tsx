'use client'

// ============================================================================
// Botón de ayuda (ⓘ) para las tarjetas de estado del ciclo de pago.
//
// Explica, en lenguaje llano, qué significa cada fase del escrow para quien
// mira el panel y no recuerda la diferencia entre "Retenido", "En ventana",
// etc. Click para abrir/cerrar; click afuera o Esc para cerrar.
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

// Explicación por estado. Deben coincidir con las claves de lifecycle_state
// usadas en STATE_CONFIG (AllPaymentsSection.tsx).
const STATE_HELP: Record<string, { title: string; body: string }> = {
  escrow_held: {
    title: 'Retenido',
    body: 'El cliente ya pagó, pero el servicio todavía no ocurrió. El dinero queda retenido por la plataforma como garantía hasta que el evento se realice.',
  },
  in_window: {
    title: 'En ventana',
    body: 'El servicio ya se realizó. Corre una ventana de 3 días antes de poder liberar el pago al chef, por si el cliente necesita reclamar algo.',
  },
  releasable: {
    title: 'A liberar',
    body: 'Pasaron los 3 días de la ventana sin reclamos. El pago está listo para transferirse al chef, descontando la comisión de la plataforma.',
  },
  released: {
    title: 'Liberado',
    body: 'El pago ya se transfirió al chef, menos la comisión de la plataforma. El ciclo terminó.',
  },
  refund_pending: {
    title: 'A reembolsar',
    body: 'La reserva se canceló o hubo un problema. El dinero debe devolverse al cliente en lugar de liberarse al chef.',
  },
}

export function StateInfoButton({ state }: { state: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const help = STATE_HELP[state]
  if (!help) return null

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Qué significa "${help.title}"`}
        aria-expanded={open}
        className="text-zinc-300 hover:text-zinc-500 transition-colors focus:outline-none focus-visible:text-zinc-500"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-6 z-30 w-56 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            {help.title}
          </p>
          <p className="text-xs leading-relaxed text-zinc-600">{help.body}</p>
        </div>
      )}
    </div>
  )
}
