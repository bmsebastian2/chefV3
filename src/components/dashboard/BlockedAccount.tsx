'use client'

import { useEffect } from 'react'
import { Lock, MessageCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/clients'

// Pantalla de cuenta deshabilitada por la administración. La renderiza el layout
// del dashboard EN LUGAR del sidebar + contenido, así el chef bloqueado queda
// contenido acá y no puede operar en ninguna subpágina.
//
// Orden mensaje → signOut: el layout (server) ya pintó esta vista CON la sesión
// válida; al montar, cerramos sesión en el cliente SIN redirigir, para que el
// chef no quede autenticado (cookies/memoria limpias, el header vuelve a
// "Acceder") pero alcance a leer el aviso y use sus salidas. No se puede cerrar
// sesión en el render del Server Component (escribe cookies), por eso va acá.
export function BlockedAccount({ reason }: { reason?: string | null }) {
  useEffect(() => {
    // signOut sin navegación: limpia la sesión pero deja la pantalla visible.
    createClient().auth.signOut().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
          <Lock className="w-7 h-7 text-red-500" />
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Cuenta suspendida
          </span>
        </div>

        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-3 leading-tight">
          Tu cuenta está deshabilitada
        </h1>

        <p className="text-sm text-zinc-500 leading-relaxed">
          La administración deshabilitó tu cuenta. Por ahora no podés recibir solicitudes,
          enviar propuestas ni aparecer públicamente. Escribinos para resolverlo y reactivar
          tu cuenta.
        </p>

        {reason && (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Motivo
            </p>
            <p className="text-sm text-zinc-700">{reason}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          {/* Navegación dura: el server reevalúa la sesión ya cerrada y el header
              arranca en "Acceder". */}
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </a>
          <a
            href="/#contacto"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar a la administración
          </a>
        </div>
      </div>
    </div>
  )
}
