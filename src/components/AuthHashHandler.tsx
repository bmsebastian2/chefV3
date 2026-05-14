'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/clients'

export function AuthHashHandler() {
  const [tokens] = useState<{ access: string; refresh: string } | null>(() => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash
    if (!hash || hash.length < 2) return null
    const params = new URLSearchParams(hash.slice(1))
    const access  = params.get('access_token')
    const refresh = params.get('refresh_token')
    return access && refresh ? { access, refresh } : null
  })

  useLayoutEffect(() => {
    if (tokens) window.history.replaceState(null, '', window.location.pathname)
  }, [tokens])

  useEffect(() => {
    if (!tokens) return

    const { access, refresh } = tokens
    const supabase = createClient()

    const go = () => window.location.replace('/client-dashboard')

    // Fallback: si algo cuelga, redirigir igual a los 5s
    const fallback = setTimeout(go, 5000)

    supabase.auth
      .setSession({ access_token: access, refresh_token: refresh })
      .then(({ error }) => {
        if (error) console.error('[auth-hash] setSession:', error.message)
      })
      .catch((err) => console.error('[auth-hash]:', err))
      .finally(() => {
        clearTimeout(fallback)
        go()
      })
  }, [tokens])

  if (!tokens) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
    }}>
      <style>{`@keyframes auth-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 40, height: 40,
        borderRadius: '50%',
        border: '3px solid #E4E4E7',
        borderTopColor: '#18181B',
        animation: 'auth-spin 0.8s linear infinite',
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 16, fontWeight: 500, color: '#18181B' }}>
          Verificando tu cuenta…
        </p>
        <p style={{ margin: '4px 0 0', fontFamily: 'sans-serif', fontSize: 14, color: '#A1A1AA' }}>
          Redirigiendo a tu dashboard
        </p>
      </div>
    </div>
  )
}
