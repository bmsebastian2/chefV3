"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/clients"

const KEY = "admin_last_activity"

/**
 * Cierra la sesión del admin tras `timeoutMs` de inactividad (sin mouse/teclado/
 * scroll/touch). La sesión de Supabase se auto-renueva sola, así que este corte
 * por inactividad es a propósito, como medida de seguridad del panel.
 *
 * Usa localStorage para que el timer sobreviva a la navegación entre páginas del
 * panel (cada página remonta el componente) y se comparta entre pestañas.
 */
export function IdleLogout({ timeoutMs = 30 * 60 * 1000 }: { timeoutMs?: number }) {
  useEffect(() => {
    let lastWrite = 0
    const bump = () => {
      const now = Date.now()
      // Throttle: mousemove dispara muchísimo; escribir como mucho cada 5s.
      if (now - lastWrite > 5000) {
        localStorage.setItem(KEY, String(now))
        lastWrite = now
      }
    }

    // Marcar actividad inicial al entrar.
    localStorage.setItem(KEY, String(Date.now()))

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))

    const check = async () => {
      const last = Number(localStorage.getItem(KEY) || Date.now())
      if (Date.now() - last >= timeoutMs) {
        const supabase = createClient()
        await supabase.auth.signOut()
        // Navegación dura para que el servidor reevalúe la sesión ya cerrada.
        window.location.replace("/")
      }
    }
    const interval = setInterval(check, 30_000) // chequear cada 30s

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      clearInterval(interval)
    }
  }, [timeoutMs])

  return null
}
