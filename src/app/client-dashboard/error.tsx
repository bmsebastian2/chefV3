'use client'

import { useEffect } from 'react'

export default function ClientDashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[client-dashboard] error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <h2 className="font-serif text-2xl font-semibold text-zinc-900 mb-3">
          Algo salió mal
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Ocurrió un error inesperado. Intentá recargar la página.
        </p>
        <button
          onClick={unstable_retry}
          className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
