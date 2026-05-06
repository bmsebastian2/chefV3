'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[global] error:', error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#FAFAFA' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#18181B', margin: 0 }}>
            Algo salió mal
          </h2>
          <p style={{ fontSize: '14px', color: '#71717A', textAlign: 'center', maxWidth: '360px', margin: 0 }}>
            Ocurrió un error inesperado. Podés intentar recargar la página.
          </p>
          <button
            onClick={unstable_retry}
            style={{ padding: '10px 20px', background: '#18181B', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
