'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[app] error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <h2 className="font-serif text-2xl font-semibold text-zinc-900 mb-3">
          Algo salió mal
        </h2>
        <p className="text-sm text-zinc-500 mb-2">
          Ocurrió un error inesperado en el servidor.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono mb-6">ID: {error.digest}</p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={unstable_retry}
            className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="px-5 py-2 border border-zinc-200 text-zinc-600 text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
