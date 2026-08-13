'use client'

// ============================================================================
// Panel admin · Moderación de chat (LAZY)
//
// Vive en la pestaña "Moderación". Muestra los intentos de compartir datos de
// contacto que el filtro server-side bloqueó antes de que el mensaje llegara al
// otro lado (ver src/lib/chat-moderation.ts). El mensaje NUNCA se insertó en
// `messages` — solo quedó acá para que el admin vea patrones de abuso.
//
// El conteo por remitente (badge "Nº intentos") se calcula en el cliente sobre
// la misma lista ya cargada — no hace falta una query aparte para detectar
// reincidencia con el volumen esperado de esta tabla.
// ============================================================================

import { useState, useEffect, useTransition } from 'react'
import { ShieldAlert, MessageCircleWarning } from 'lucide-react'
import { getModerationFlags } from './actions'

type FlagRow = NonNullable<Awaited<ReturnType<typeof getModerationFlags>>['data']>[number]

const CATEGORY_LABELS: Record<string, string> = {
  phone:           'Teléfono',
  email:           'Email',
  social:          'Red social',
  keyword:         'Frase de contacto',
  spelled_digits:  'Números deletreados',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ModerationSection() {
  const [flags, setFlags]   = useState<FlagRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const res = await getModerationFlags()
      if (res.error || !res.data) {
        setError(res.error ?? 'No se pudieron cargar los intentos registrados')
        return
      }
      setFlags(res.data)
      setLoaded(true)
    })
  }, [])

  // Reincidencia: cuántas veces aparece cada sender_id en la lista cargada.
  const countBySender: Record<string, number> = {}
  for (const f of flags) countBySender[f.sender_id] = (countBySender[f.sender_id] ?? 0) + 1

  if (pending && !loaded) {
    return <p className="text-sm text-zinc-400 py-10 text-center">Cargando…</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 py-10 text-center">{error}</p>
  }

  if (flags.length === 0) {
    return (
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
        <ShieldAlert className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">No se registraron intentos de compartir datos de contacto.</p>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircleWarning className="w-4 h-4 text-amber-600" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Intentos de desintermediación
        </h2>
        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
          {flags.length}
        </span>
      </div>

      <div className="space-y-3">
        {flags.map((f) => {
          const repeatCount = countBySender[f.sender_id]
          return (
            <div key={f.id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <p className="font-semibold text-zinc-900 text-sm">{f.sender_name}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                  {f.sender_role === 'chef' ? 'Chef' : 'Cliente'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {CATEGORY_LABELS[f.matched_category] ?? f.matched_category}
                </span>
                {repeatCount > 1 && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {repeatCount} intentos
                  </span>
                )}
                <span className="text-xs text-zinc-400 ml-auto">{fmtDateTime(f.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                {f.content}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
