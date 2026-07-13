'use client'

// ============================================================================
// Panel admin · Navegación por pestañas
//
// Convierte el dashboard (antes una sola columna larga) en pestañas. Cada panel
// queda MONTADO y se oculta con `hidden` al cambiar de pestaña — así no se pierde
// el estado del cliente (p.ej. las solicitudes ya cargadas de forma lazy en
// "Solicitudes" siguen ahí al volver).
//
// La pestaña activa se persiste en la URL (?tab=) para que los formularios GET
// de filtros (que recargan la página) vuelvan a la misma pestaña.
// ============================================================================

import { useState, useEffect, type ReactNode } from 'react'

export type AdminTab = {
  id:       string
  label:    string
  icon:     ReactNode
  badge?:   number
  content:  ReactNode
}

export function AdminTabs({
  tabs,
  initialTab,
}: {
  tabs: AdminTab[]
  initialTab?: string
}) {
  const first = tabs.some((t) => t.id === initialTab) ? initialTab! : tabs[0].id
  const [active, setActive] = useState(first)

  // Pestañas que ya se abrieron al menos una vez. Un panel se monta recién la
  // primera vez que se activa (lazy-mount) y luego queda montado para conservar
  // su estado. Esto hace que el contenido lazy (Solicitudes) recién dispare su
  // carga cuando el admin entra a esa pestaña.
  const [activated, setActivated] = useState<Set<string>>(() => new Set([first]))

  // Cambiar de pestaña + registrar su activación (en el handler, no en render).
  // El bail-out evita recrear el Set y remontar al reseleccionar una ya abierta.
  const selectTab = (id: string) => {
    setActive(id)
    setActivated((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  // Refleja la pestaña en la URL sin recargar, para que un submit de filtro
  // (form GET) regrese a la misma pestaña vía ?tab=.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('tab') !== active) {
      url.searchParams.set('tab', active)
      window.history.replaceState(null, '', url)
    }
  }, [active])

  return (
    <>
      {/* Barra de pestañas — pegada bajo el header (h-14) */}
      <div className="sticky top-14 z-10 -mx-6 mb-8 border-b border-zinc-200 bg-zinc-50/85 px-6 backdrop-blur">
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const on = t.id === active
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => selectTab(t.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:px-4 ${
                  on ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <span className={on ? 'text-accent' : 'text-zinc-400'}>{t.icon}</span>
                {t.label}
                {t.badge ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      on ? 'bg-accent text-white' : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {t.badge}
                  </span>
                ) : null}
                {on && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent sm:inset-x-3.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Paneles — se montan al abrirse por primera vez y luego quedan montados
          (ocultos si no son la pestaña activa) para conservar su estado. */}
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          hidden={t.id !== active}
          className={t.id === active ? '' : 'hidden'}
        >
          {activated.has(t.id) ? t.content : null}
        </div>
      ))}
    </>
  )
}
