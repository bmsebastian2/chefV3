'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { NicaraguaChefMap, type ChefMarker } from './NicaraguaChefMap'

/**
 * Sección pública de la home: mapa interactivo de Nicaragua con los chefs activos.
 *
 * Carga LAZY: el shell (encabezado + SVG vacío) se renderiza al instante, pero los
 * chefs NO se piden en el initial load. El fetch a `/api/chefs-map` (que corre el RPC
 * SECURITY DEFINER server-side) se dispara una sola vez, cuando la sección entra en
 * viewport vía IntersectionObserver. El botón "Ver mapa completo" del hero scrollea
 * hasta acá (`#mapa`), así que ese click también termina disparando la carga por el
 * mismo camino — sin estado compartido entre componentes.
 */
type Status = 'idle' | 'loading' | 'loaded' | 'error'

export function NicaraguaChefMapSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const fetchedRef = useRef(false)
  const [chefs, setChefs] = useState<ChefMarker[]>([])
  const [status, setStatus] = useState<Status>('idle')

  const loadChefs = async () => {
    // Guarda: una sola ejecución por sesión de página (scroll arriba/abajo no re-fetchea).
    if (fetchedRef.current) return
    fetchedRef.current = true
    setStatus('loading')
    try {
      const res = await fetch('/api/chefs-map')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setChefs(Array.isArray(json.chefs) ? json.chefs : [])
      setStatus('loaded')
    } catch (err) {
      console.warn('NicaraguaChefMapSection: no se pudo cargar chefs —', err)
      fetchedRef.current = false // permitir reintento manual
      setStatus('error')
    }
  }

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          loadChefs()
        }
      },
      // Adelantamos ~200px para que la carga arranque justo antes de llegar.
      { rootMargin: '200px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="mapa" ref={sectionRef} className="relative bg-background py-24 md:py-28">
      <div className="container mx-auto max-w-[1100px] px-6">
        {/* Encabezado */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            <span className="h-px w-5 bg-emerald-500/70" aria-hidden="true" />
            Cobertura nacional
            <span className="h-px w-5 bg-emerald-500/70" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Chefs activos en todo <span className="text-accent">Nicaragua</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Explorá el mapa por departamento, descubrí quién cocina cerca tuyo y
            abrí el perfil de cada chef disponible en tu zona.
          </p>
        </div>

        {/* Mapa (el SVG se ve siempre; los marcadores entran cuando llega el fetch) */}
        <div className="relative">
          <NicaraguaChefMap mode="chefs" chefs={chefs} />

          {/* Indicador de carga: pill sutil sobre el mapa */}
          {status === 'loading' && (
            <div
              className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2"
              role="status"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Cargando chefs…
              </span>
            </div>
          )}

          {/* Estado de error con reintento */}
          {status === 'error' && (
            <div
              className="absolute left-1/2 top-6 z-30 -translate-x-1/2"
              role="alert"
            >
              <button
                type="button"
                onClick={loadChefs}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm backdrop-blur transition-colors hover:border-amber-300 hover:text-amber-800"
              >
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                No se pudieron cargar los chefs. Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
