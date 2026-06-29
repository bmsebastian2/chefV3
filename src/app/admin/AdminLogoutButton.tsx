"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/clients"

/**
 * Logout del panel admin con navegación DURA (no la server action `logout`).
 *
 * La server action hace signOut() + redirect('/'), pero ese redirect es una
 * navegación soft (RSC): el middleware reevalúa la sesión antes de que las
 * cookies limpiadas se apliquen, ve al admin todavía logueado y lo rebota a
 * /admin. Como la página admin es `force-dynamic` y pesada, ese rebote queda
 * atascado en "Rendering". Igual que IdleLogout, cerramos en cliente y hacemos
 * window.location.replace para que el servidor reevalúe la sesión ya cerrada.
 */
export function AdminLogoutButton() {
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    if (pending) return
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    // Navegación dura: el servidor reevalúa la sesión ya cerrada (sin rebote).
    window.location.replace("/")
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{pending ? "Saliendo…" : "Cerrar sesión"}</span>
    </button>
  )
}
