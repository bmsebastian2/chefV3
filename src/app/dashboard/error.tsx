'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="font-serif text-2xl font-semibold text-zinc-900">
        Algo salió mal
      </h2>
      <p className="text-sm text-zinc-500 text-center max-w-sm">
        Ocurrió un error inesperado. Podés intentar recargar la página o volver al dashboard.
      </p>
      <button
        onClick={unstable_retry}
        className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
