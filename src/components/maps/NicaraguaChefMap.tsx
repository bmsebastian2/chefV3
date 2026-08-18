'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChefHat, Star, MapPin, X, ArrowUpRight, Users, UtensilsCrossed } from 'lucide-react'
import { useMercatorProjection } from '@/lib/maps/useMercatorProjection'
import { resolveCity, CITIES, type CityEntry } from '@/lib/maps/cities'
import { CULINARY } from '@/lib/maps/culinary'

// ── Tipos públicos ───────────────────────────────────────────────────────────

export type ChefMarker = {
  id: string
  first_name: string | null
  first_surname: string | null
  photo_url: string | null
  city: string | null
  rating_avg: number | null
  rating_count: number | null
  tagline: string | null
}

export type DemandRow = { city: string; demand: number }

type NicaraguaChefMapProps =
  | {
      mode: 'chefs'
      chefs: ChefMarker[]
      /** Destino del botón "Ver perfil". Por defecto ancla #chefs. */
      profileHref?: (chefId: string) => string
    }
  | {
      mode: 'demand'
      demand: DemandRow[]
      /** Claves normalizadas de las ciudades que el chef cubre (base + adicionales). */
      coveredCities?: string[]
    }

// ── Constantes de layout ───────────────────────────────────────────────────────

const HEIGHT_RATIO = 0.92 // alto = ancho × ratio (aprox. proporción de Nicaragua)

/**
 * Orden geográfico de la "Ruta Culinaria" (NO orden alfabético): un recorrido
 * real de Pacífico a lago con una escapada al campo — León → Managua → Boaco
 * → Masaya → Granada. Solo se dibujan los departamentos que además tienen
 * entrada en `CULINARY` — agregar un depto acá sin contenido curado no rompe
 * nada, simplemente no se pinta.
 */
const CULINARY_ROUTE_ORDER = ['leon', 'managua', 'boaco', 'masaya', 'granada']

/**
 * Dirección (vector unitario, no normalizado) hacia un hueco vacío dentro del
 * propio polígono del departamento, lejos de la capital. Se calculó una vez
 * offline: point-in-polygon sobre el geojson real buscando el punto más
 * alejado del borde del departamento a ~9-26km de la ciudad. Acá solo queda
 * la DIRECCIÓN — la magnitud del desplazamiento es un valor fijo en px
 * (`CULINARY_PIN_OFFSET_PX`) para que la separación visual del marcador del
 * chef sea consistente sin importar el ancho del mapa (un offset puramente
 * geográfico da apenas 5-15px en mobile, insuficiente).
 */
const CULINARY_PIN_DIRECTION: Record<string, { dx: number; dy: number }> = {
  leon: { dx: 0.85, dy: 0.52 }, // hacia el interior del depto (sureste)
  managua: { dx: -0.94, dy: -0.34 }, // hacia el oeste/noroeste, lejos del centro
  boaco: { dx: -0.97, dy: 0.08 }, // hacia el oeste, lejos de la frontera con Chontales
  masaya: { dx: 0.37, dy: -0.93 }, // hacia el norte, el depto es angosto
  granada: { dx: 0.82, dy: 0.57 }, // hacia el sureste, lejos de la costa del lago
}
const CULINARY_PIN_OFFSET_PX = 54

// ── Helpers ────────────────────────────────────────────────────────────────────

function chefName(c: ChefMarker): string {
  return [c.first_name, c.first_surname].filter(Boolean).join(' ').trim() || 'Chef'
}

/** Agrupa chefs por ciudad resuelta; los no resueltos van al balde "otras". */
function groupChefsByCity(chefs: ChefMarker[]) {
  const byCity = new Map<string, { entry: CityEntry; chefs: ChefMarker[] }>()
  const unmatched: ChefMarker[] = []

  for (const chef of chefs) {
    const resolved = resolveCity(chef.city)
    if (!resolved) {
      unmatched.push(chef)
      continue
    }
    const bucket = byCity.get(resolved.key)
    if (bucket) bucket.chefs.push(chef)
    else byCity.set(resolved.key, { entry: resolved.entry, chefs: [chef] })
  }

  return { byCity, unmatched }
}

/**
 * Traza una curva suave (beziers cuadráticas, arco alternado por tramo) a
 * través de una serie de puntos ya proyectados a pantalla. Da a la "Ruta
 * culinaria" el aspecto de un trazo dibujado a mano en vez de líneas rectas.
 */
function buildRoutePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const bow = len * 0.14 * (i % 2 === 0 ? 1 : -1)
    const cx = (a.x + b.x) / 2 + (-dy / len) * bow
    const cy = (a.y + b.y) / 2 + (dx / len) * bow
    d += ` Q ${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`
  }
  return d
}

// ── Componente principal ─────────────────────────────────────────────────────

export function NicaraguaChefMap(props: NicaraguaChefMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const reducedMotion = usePrefersReducedMotion()

  // Medir el ancho disponible (mobile-first, responsive).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const height = Math.round(width * HEIGHT_RATIO)
  const { ready, departments, project } = useMercatorProjection(width, height)

  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  // ── Datos derivados según el modo ──────────────────────────────────────────

  const chefData = useMemo(() => {
    if (props.mode !== 'chefs') return null
    const { byCity, unmatched } = groupChefsByCity(props.chefs)
    const countByDept = new Map<string, number>()
    for (const { entry, chefs } of byCity.values()) {
      countByDept.set(entry.departmentId, (countByDept.get(entry.departmentId) ?? 0) + chefs.length)
    }
    return { byCity, unmatched, countByDept }
  }, [props])

  const demandData = useMemo(() => {
    if (props.mode !== 'demand') return null
    const byDept = new Map<string, number>()
    let unlocated = 0
    for (const row of props.demand) {
      const resolved = resolveCity(row.city)
      if (!resolved) {
        unlocated += row.demand
        continue
      }
      const dept = resolved.entry.departmentId
      byDept.set(dept, (byDept.get(dept) ?? 0) + row.demand)
    }
    const max = Math.max(1, ...byDept.values())
    return { byDept, unlocated, max }
  }, [props])

  // Departamentos que el chef cubre: se derivan de sus ciudades cubiertas
  // (clave normalizada → departmentId vía catálogo). Granularidad de depto porque
  // el mapa es por departamento; un depto se resalta si cubre ≥1 ciudad del chef.
  const coveredDepts = useMemo(() => {
    if (props.mode !== 'demand' || !props.coveredCities?.length) return null
    const set = new Set<string>()
    for (const key of props.coveredCities) {
      const resolved = resolveCity(key)
      if (resolved) set.add(resolved.entry.departmentId)
    }
    return set.size ? set : null
  }, [props])

  // ── Estilo de relleno por departamento ─────────────────────────────────────

  const fillFor = useCallback(
    (deptId: string): { fill: string; stroke: string; strokeWidth: number; dash?: string } => {
      const isHover = hoveredDept === deptId
      const isSelected = selectedDept === deptId

      if (props.mode === 'demand' && demandData) {
        const value = demandData.byDept.get(deptId) ?? 0
        const intensity = value === 0 ? 0 : 0.15 + 0.65 * (value / demandData.max)
        const isCovered = coveredDepts?.has(deptId) ?? false
        return {
          fill: value === 0 ? '#f4f4f5' : `rgba(34,197,94,${intensity.toFixed(3)})`,
          // Cobertura del chef: borde sólido emerald, por encima del estilo de hover.
          stroke: isCovered ? '#059669' : isHover ? '#16a34a' : '#d4d4d8',
          strokeWidth: isCovered ? 2 : isHover ? 1.5 : 0.75,
          dash: isCovered ? '4 2' : undefined,
        }
      }

      // modo chefs
      const hasChefs = (chefData?.countByDept.get(deptId) ?? 0) > 0
      let fill = '#f4f4f5'
      if (isSelected) fill = 'rgba(34,197,94,0.22)'
      else if (isHover) fill = 'rgba(34,197,94,0.16)'
      else if (hasChefs) fill = 'rgba(34,197,94,0.08)'
      return {
        fill,
        stroke: isSelected || isHover ? '#16a34a' : '#d4d4d8',
        strokeWidth: isSelected || isHover ? 1.5 : 0.75,
      }
    },
    [props.mode, demandData, chefData, coveredDepts, hoveredDept, selectedDept]
  )

  const toggleDept = useCallback((deptId: string) => {
    setSelectedCity(null)
    setSelectedDept((prev) => (prev === deptId ? null : deptId))
  }, [])

  const transition = reducedMotion ? 'none' : 'fill 150ms ease, stroke 150ms ease'

  // ── Marcadores (solo modo chefs) ───────────────────────────────────────────

  const markers = useMemo(() => {
    if (props.mode !== 'chefs' || !chefData || !ready) return []
    const out: {
      key: string
      x: number
      y: number
      entry: CityEntry
      chefs: ChefMarker[]
    }[] = []
    for (const [key, { entry, chefs }] of chefData.byCity) {
      const pt = project([entry.lng, entry.lat])
      if (!pt) continue
      out.push({ key, x: pt[0], y: pt[1], entry, chefs })
    }
    return out
  }, [props.mode, chefData, ready, project])

  const activeCity = useMemo(() => {
    if (!selectedCity) return null
    return markers.find((m) => m.key === selectedCity) ?? null
  }, [selectedCity, markers])

  // ── Ruta culinaria (solo modo chefs) ────────────────────────────────────────
  // Puntos proyectados de los departamentos con contenido curado, en el orden
  // geográfico del recorrido. Parte de las mismas coordenadas de ciudad que
  // los marcadores de chefs, pero desplaza el medallón hacia el hueco vacío
  // del departamento (offset fijo en px) para que nunca quede pegado al pin
  // verde del chef. `cityX/cityY` guardan el punto exacto para el hilo
  // conector que muestra a qué ciudad pertenece cada plato.
  const culinaryRoute = useMemo(() => {
    if (props.mode !== 'chefs' || !ready) return []
    const out: {
      deptId: string
      x: number
      y: number
      cityX: number
      cityY: number
      dish: NonNullable<(typeof CULINARY)[string]>
    }[] = []
    for (const deptId of CULINARY_ROUTE_ORDER) {
      const dish = CULINARY[deptId]
      const city = CITIES[deptId]
      const dir = CULINARY_PIN_DIRECTION[deptId]
      if (!dish || !city || !dir) continue
      const pt = project([city.lng, city.lat])
      if (!pt) continue
      const len = Math.hypot(dir.dx, dir.dy) || 1
      const x = pt[0] + (dir.dx / len) * CULINARY_PIN_OFFSET_PX
      const y = pt[1] + (dir.dy / len) * CULINARY_PIN_OFFSET_PX
      out.push({ deptId, x, y, cityX: pt[0], cityY: pt[1], dish })
    }
    return out
  }, [props.mode, ready, project])

  const culinaryRoutePath = useMemo(() => buildRoutePath(culinaryRoute), [culinaryRoute])

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? id

  return (
    <div>
      {/* ── Lienzo del mapa ── */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-zinc-50 shadow-inner"
        style={{ minHeight: width ? undefined : 320 }}
      >
        {!ready && (
          <div className="flex h-80 items-center justify-center text-sm text-zinc-400">
            Cargando mapa…
          </div>
        )}

        {ready && (
          <>
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="group"
              aria-label="Mapa de Nicaragua por departamentos"
              className="block"
            >
              {departments.map((dept) => {
                const style = fillFor(dept.id)
                const count = chefData?.countByDept.get(dept.id) ?? 0
                const demand = demandData?.byDept.get(dept.id) ?? 0
                const label =
                  props.mode === 'chefs'
                    ? `${dept.name}: ${count} chef${count === 1 ? '' : 's'}`
                    : `${dept.name}: ${demand} solicitud${demand === 1 ? '' : 'es'}`
                const interactive = props.mode === 'chefs'
                return (
                  <path
                    key={dept.id}
                    d={dept.d}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dash}
                    style={{ transition, cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
                    role={interactive ? 'button' : 'img'}
                    aria-label={label}
                    aria-pressed={interactive ? selectedDept === dept.id : undefined}
                    tabIndex={interactive ? 0 : -1}
                    onMouseEnter={() => setHoveredDept(dept.id)}
                    onMouseLeave={() => setHoveredDept((p) => (p === dept.id ? null : p))}
                    onFocus={() => setHoveredDept(dept.id)}
                    onBlur={() => setHoveredDept((p) => (p === dept.id ? null : p))}
                    onClick={interactive ? () => toggleDept(dept.id) : undefined}
                    onKeyDown={
                      interactive
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleDept(dept.id)
                            }
                          }
                        : undefined
                    }
                  />
                )
              })}

              {/* Ruta culinaria: trazo punteado que une los departamentos con contenido curado */}
              {culinaryRoutePath && (
                <path
                  d={culinaryRoutePath}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="1 11"
                  opacity={0.7}
                  pointerEvents="none"
                  className={reducedMotion ? undefined : 'culinary-route-path'}
                />
              )}

              {/* Hilo fino que ancla cada medallón a su ciudad exacta (el medallón vive corrido, en hueco vacío) */}
              {culinaryRoute.map((node) => (
                <line
                  key={`stem-${node.deptId}`}
                  x1={node.cityX}
                  y1={node.cityY}
                  x2={node.x}
                  y2={node.y}
                  stroke="#b45309"
                  strokeWidth={1.25}
                  strokeDasharray="1 3"
                  opacity={0.4}
                  pointerEvents="none"
                />
              ))}
            </svg>

            {/* Marcadores de chefs (overlay HTML) */}
            {props.mode === 'chefs' &&
              markers.map((m) => {
                const isActive = selectedCity === m.key
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedDept(null)
                      setSelectedCity((p) => (p === m.key ? null : m.key))
                    }}
                    aria-label={`${m.entry.name}: ${m.chefs.length} chef${m.chefs.length === 1 ? '' : 's'}`}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ left: m.x, top: m.y }}
                  >
                    <span
                      className={[
                        'relative flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-md transition-transform',
                        reducedMotion ? '' : 'group-hover:scale-110 group-focus-visible:scale-110',
                        isActive ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-emerald-400/70',
                      ].join(' ')}
                    >
                      <ChefHat className="h-4 w-4 text-emerald-600" />
                      {m.chefs.length > 1 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                          {m.chefs.length}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}

            {/* Ruta culinaria: medallones con foto + nombre del plato, siempre visibles.
                Se posicionan en un hueco vacío del departamento (offset fijo en px,
                no geográfico) para no pisar el marcador verde del chef; el hilo
                punteado del SVG los ancla visualmente a su ciudad exacta. */}
            {props.mode === 'chefs' &&
              culinaryRoute.map((node, i) => {
                const isActive = hoveredDept === node.deptId || selectedDept === node.deptId
                return (
                  <div
                    key={node.deptId}
                    className="absolute z-10"
                    style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDept(node.deptId)}
                      onMouseEnter={() => setHoveredDept(node.deptId)}
                      onMouseLeave={() => setHoveredDept((p) => (p === node.deptId ? null : p))}
                      onFocus={() => setHoveredDept(node.deptId)}
                      onBlur={() => setHoveredDept((p) => (p === node.deptId ? null : p))}
                      aria-label={`Ruta culinaria — ${node.dish.dish} en ${deptName(node.deptId)}`}
                      aria-pressed={selectedDept === node.deptId}
                      className={[
                        'group flex flex-col items-center focus:outline-none',
                        reducedMotion ? '' : 'culinary-pin-in',
                      ].join(' ')}
                      style={reducedMotion ? undefined : { animationDelay: `${i * 110}ms` }}
                    >
                      <span
                        className={[
                          'relative h-11 w-11 overflow-hidden rounded-full border-2 bg-white shadow-lg transition-transform sm:h-12 sm:w-12',
                          reducedMotion ? '' : 'group-hover:scale-110 group-focus-visible:scale-110',
                          isActive ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-amber-400/80 ring-1 ring-white',
                        ].join(' ')}
                      >
                        <Image src={node.dish.image} alt={node.dish.imageAlt} fill sizes="48px" className="object-cover" />
                      </span>
                      <span className="mt-1 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 font-serif text-[11px] italic text-amber-800 shadow-sm ring-1 ring-amber-100">
                        {node.dish.dish}
                      </span>
                    </button>
                  </div>
                )
              })}

            {/* Mini-card del chef / ciudad */}
            {activeCity && (
              <MiniCard
                city={activeCity.entry}
                chefs={activeCity.chefs}
                x={activeCity.x}
                y={activeCity.y}
                profileHref={props.mode === 'chefs' ? props.profileHref : undefined}
                onClose={() => setSelectedCity(null)}
              />
            )}

            {/* Panel de la ruta culinaria (solo modo chefs) */}
            {props.mode === 'chefs' &&
              selectedDept &&
              (() => {
                const dept = departments.find((d) => d.id === selectedDept)
                if (!dept) return null
                return (
                  <CulinaryPanel
                    deptId={selectedDept}
                    deptName={dept.name}
                    x={dept.centroid[0]}
                    y={dept.centroid[1]}
                    onClose={() => setSelectedDept(null)}
                  />
                )
              })()}

            {/* Tooltip de departamento al hover/foco */}
            {hoveredDept && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur">
                {props.mode === 'chefs'
                  ? `${deptName(hoveredDept)} · ${chefData?.countByDept.get(hoveredDept) ?? 0} chefs${
                      CULINARY[hoveredDept] ? ` · ${CULINARY[hoveredDept]!.dish}` : ''
                    }`
                  : `${deptName(hoveredDept)} · ${demandData?.byDept.get(hoveredDept) ?? 0} solicitudes`}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Leyenda de la ruta culinaria ── */}
      {props.mode === 'chefs' && culinaryRoute.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Chefs disponibles
          </span>
          <span className="flex items-center gap-1.5">
            <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            Ruta culinaria — tocá un plato para descubrirlo
          </span>
        </div>
      )}

      {/* ── Leyenda de demanda ── */}
      {props.mode === 'demand' && demandData && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Menos</span>
            <span className="flex h-2.5 w-32 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-600" />
            <span>Más demanda</span>
          </div>
          <div className="flex items-center gap-4">
            {coveredDepts && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-3 w-4 rounded-sm border-2 border-dashed"
                  style={{ borderColor: '#059669' }}
                  aria-hidden="true"
                />
                Tu cobertura
              </span>
            )}
            {demandData.unlocated > 0 && (
              <span className="text-zinc-400">{demandData.unlocated} sin ubicar</span>
            )}
          </div>
        </div>
      )}

      {/* ── Lista de chefs bajo el mapa ── */}
      {props.mode === 'chefs' && chefData && (
        <ChefList
          chefs={props.chefs}
          byCity={chefData.byCity}
          unmatched={chefData.unmatched}
          selectedDept={selectedDept}
          selectedDeptName={selectedDept ? deptName(selectedDept) : null}
          onClearDept={() => setSelectedDept(null)}
          profileHref={props.profileHref}
        />
      )}

      {props.mode === 'chefs' && culinaryRoute.length > 0 && !reducedMotion && (
        <style jsx>{`
          @keyframes culinaryRouteFlow {
            to {
              stroke-dashoffset: -24;
            }
          }
          .culinary-route-path {
            animation: culinaryRouteFlow 2.2s linear infinite;
          }
          @keyframes culinaryPinIn {
            from {
              opacity: 0;
              transform: scale(0.6);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .culinary-pin-in {
            transform-origin: center;
            animation: culinaryPinIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      )}
    </div>
  )
}

// ── Mini-card ──────────────────────────────────────────────────────────────────

function MiniCard({
  city,
  chefs,
  x,
  y,
  profileHref,
  onClose,
}: {
  city: CityEntry
  chefs: ChefMarker[]
  x: number
  y: number
  profileHref?: (chefId: string) => string
  onClose: () => void
}) {
  const isMobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()
  // Animación de entrada del bottom-sheet: arranca abajo y sube tras el mount.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const header = (
    <div className="mb-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
        <MapPin className="h-3.5 w-3.5" />
        {city.name}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  // ── Mobile: hoja que sube desde abajo, con backdrop ──
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-20 bg-zinc-900/20 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={[
            'fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-zinc-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl',
            reducedMotion ? '' : 'transition-transform duration-300 ease-out',
            shown ? 'translate-y-0' : 'translate-y-full',
          ].join(' ')}
          role="dialog"
          aria-label={`Chefs en ${city.name}`}
        >
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-zinc-200" aria-hidden="true" />
          {header}
          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {chefs.map((chef) => (
              <ChefRow key={chef.id} chef={chef} profileHref={profileHref} compact />
            ))}
          </div>
        </div>
      </>
    )
  }

  // ── Desktop: popup anclado al marcador (sin cambios) ──
  return (
    <div
      className="absolute z-20 w-64 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl"
      style={{ left: x, top: y + 18 }}
      role="dialog"
      aria-label={`Chefs en ${city.name}`}
    >
      {header}
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {chefs.map((chef) => (
          <ChefRow key={chef.id} chef={chef} profileHref={profileHref} compact />
        ))}
      </div>
    </div>
  )
}

// ── Panel de la ruta culinaria ────────────────────────────────────────────────

function CulinaryPanel({
  deptId,
  deptName,
  x,
  y,
  onClose,
}: {
  deptId: string
  deptName: string
  x: number
  y: number
  onClose: () => void
}) {
  const isMobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const dish = CULINARY[deptId]

  const goToChefs = () => {
    onClose()
    requestAnimationFrame(() => {
      document
        .getElementById('mapa-chef-list')
        ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    })
  }

  const header = (
    <div className="mb-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
        <UtensilsCrossed className="h-3.5 w-3.5" />
        Ruta culinaria
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  const body = dish ? (
    <>
      <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-zinc-100 sm:h-40">
        <Image
          src={dish.image}
          alt={dish.imageAlt}
          fill
          sizes="(min-width: 640px) 320px, 90vw"
          className="object-cover"
        />
      </div>
      <h4 className="font-serif text-lg font-semibold text-zinc-900">{dish.dish}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{dish.description}</p>
      <button
        type="button"
        onClick={goToChefs}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
      >
        Ver chefs en {deptName}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </>
  ) : (
    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-400">
      Muy pronto sumamos la tradición culinaria de {deptName}.
    </p>
  )

  // ── Mobile: hoja que sube desde abajo, con backdrop ──
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-20 bg-zinc-900/20 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={[
            'fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-zinc-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl',
            reducedMotion ? '' : 'transition-transform duration-300 ease-out',
            shown ? 'translate-y-0' : 'translate-y-full',
          ].join(' ')}
          role="dialog"
          aria-label={`Ruta culinaria: ${deptName}`}
        >
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-zinc-200" aria-hidden="true" />
          {header}
          {body}
        </div>
      </>
    )
  }

  // ── Desktop: popup anclado al centroide del departamento ──
  return (
    <div
      className="absolute z-20 w-72 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl sm:w-80"
      style={{ left: x, top: y + 12 }}
      role="dialog"
      aria-label={`Ruta culinaria: ${deptName}`}
    >
      {header}
      {body}
    </div>
  )
}

// ── Fila / tarjeta de chef ───────────────────────────────────────────────────

function ChefRow({
  chef,
  profileHref,
  compact = false,
}: {
  chef: ChefMarker
  profileHref?: (chefId: string) => string
  compact?: boolean
}) {
  const href = profileHref ? profileHref(chef.id) : '#chefs'
  const name = chefName(chef)
  return (
    <Link
      href={href}
      className={[
        'group flex items-center gap-3 rounded-xl border border-zinc-100 bg-white transition-colors hover:border-emerald-200 hover:bg-emerald-50/40',
        compact ? 'p-2 sm:p-2.5' : 'p-2.5',
      ].join(' ')}
    >
      <span
        className={[
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-400',
          compact ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-10 w-10',
        ].join(' ')}
      >
        {chef.photo_url ? (
          <Image src={chef.photo_url} alt={name} fill sizes="40px" className="object-cover" />
        ) : (
          <ChefHat className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900">{name}</span>
        {chef.tagline && (
          <span className={['truncate text-xs text-zinc-500', compact ? 'hidden sm:block' : 'block'].join(' ')}>
            {chef.tagline}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
          {(chef.rating_count ?? 0) > 0 && typeof chef.rating_avg === 'number' && (
            <span className="flex items-center gap-0.5 text-amber-600">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {chef.rating_avg.toFixed(1)}
            </span>
          )}
          {chef.city && (
            <span className={['truncate', compact ? 'hidden sm:inline' : ''].join(' ')}>{chef.city}</span>
          )}
        </span>
      </span>
      {!compact && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-emerald-600" />
      )}
    </Link>
  )
}

// ── Lista de chefs filtrable ─────────────────────────────────────────────────

function ChefList({
  byCity,
  unmatched,
  selectedDept,
  selectedDeptName,
  onClearDept,
  profileHref,
}: {
  chefs: ChefMarker[]
  byCity: Map<string, { entry: CityEntry; chefs: ChefMarker[] }>
  unmatched: ChefMarker[]
  selectedDept: string | null
  selectedDeptName: string | null
  onClearDept: () => void
  profileHref?: (chefId: string) => string
}) {
  const visible = useMemo(() => {
    const list: ChefMarker[] = []
    for (const { entry, chefs } of byCity.values()) {
      if (!selectedDept || entry.departmentId === selectedDept) list.push(...chefs)
    }
    return list
  }, [byCity, selectedDept])

  return (
    <div id="mapa-chef-list" className="mt-6 scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-700">
          {selectedDeptName ? `Chefs en ${selectedDeptName}` : 'Chefs disponibles'}
          <span className="ml-2 text-zinc-400">({visible.length})</span>
        </h3>
        {selectedDept && (
          <button
            type="button"
            onClick={onClearDept}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:text-emerald-700"
          >
            <X className="h-3 w-3" />
            Quitar filtro
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((chef) => (
            <ChefRow key={chef.id} chef={chef} profileHref={profileHref} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
          No hay chefs activos en esta zona todavía.
        </p>
      )}

      {/* Fallback: chefs sin ciudad reconocida */}
      {!selectedDept && unmatched.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <Users className="h-3.5 w-3.5" />
            Otras ciudades ({unmatched.length})
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {unmatched.map((chef) => (
              <ChefRow key={chef.id} chef={chef} profileHref={profileHref} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hook: viewport mobile (< 640px, breakpoint sm de Tailwind) ───────────────

function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(max-width: 639px)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(max-width: 639px)').matches,
    () => false // snapshot de servidor: asumimos desktop (el overlay solo aparece tras click)
  )
}

// ── Hook: prefers-reduced-motion ─────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false // snapshot de servidor: sin reducción de movimiento por defecto
  )
}
