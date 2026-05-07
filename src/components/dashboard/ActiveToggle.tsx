'use client'

import { useState, useTransition } from 'react'
import { toggleIsActive } from '@/app/dashboard/actions'

export function ActiveToggle({
  chefId,
  initialActive,
}: {
  chefId: string
  initialActive: boolean
}) {
  const [active, setActive] = useState(initialActive)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const next = !active
    setActive(next)
    startTransition(async () => {
      try {
        await toggleIsActive(chefId, active)
      } catch {
        setActive(active)
      }
    })
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
      <div>
        <p className="text-sm font-semibold text-zinc-800">
          {active ? 'Perfil activo' : 'Perfil inactivo'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {active
            ? 'Los clientes pueden encontrarte y enviarte solicitudes.'
            : 'Estás oculto para los clientes. No recibirás nuevas solicitudes.'}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={pending}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
          active ? 'bg-emerald-500' : 'bg-zinc-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
            active ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
