'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/clients'

export function AuthHashHandler() {
  const [processing, setProcessing] = useState(false)
  const tokensRef = useRef<{ access: string; refresh: string } | null>(null)

  useLayoutEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return

    const params = new URLSearchParams(hash.slice(1))
    const access  = params.get('access_token')
    const refresh = params.get('refresh_token')

    if (access && refresh) {
      tokensRef.current = { access, refresh }
      setProcessing(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!processing || !tokensRef.current) return

    const { access, refresh } = tokensRef.current
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
  }, [processing])

  if (!processing) return null

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
