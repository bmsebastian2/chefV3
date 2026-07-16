// La carta: numerales, texto para el chef y handoff al wizard.
//
// Fuente de verdad compartida por el constructor (que arma la URL) y el wizard
// (que la lee y siembra data.details). Ambos lados formatean con las MISMAS
// funciones: el texto que ve el chef se genera una sola vez, acá.

import {
  COURSE_ORDER,
  dishById,
  type Course,
  type Dish,
  type Momento,
} from './dishes'

/** Plato elegido por tiempo. Un tiempo sin elegir simplemente no va en la carta. */
export type Seleccion = Partial<Record<Course, string>>

// Tres tiempos, tres numerales. El orden de servicio es el orden de la carta.
const ROMANOS = ['I', 'II', 'III'] as const

export const romano = (index: number): string => ROMANOS[index] ?? String(index + 1)

export const MOMENTO_LABEL: Record<Momento, string> = {
  lunch:  'el almuerzo',
  dinner: 'la cena',
}

/**
 * Platos de una selección, en orden de servicio y ya numerados por su posición
 * real: si no hay entrada, el principal es I. El numeral no es decoración, es
 * el orden en que los platos llegan a la mesa.
 */
export function platosDeCarta(seleccion: Seleccion): Dish[] {
  return COURSE_ORDER
    .map((course) => seleccion[course])
    .filter((id): id is string => !!id)
    .map((id) => dishById(id))
    .filter((d): d is Dish => !!d)
}

/**
 * Texto de la carta para `data.details` → `descripcion_evento`.
 *
 * Formato pensado para dos medios a la vez: en el textarea del wizard se lee
 * como una carta en varias líneas, y en el email del chef —que interpola las
 * notas en un <span> sin white-space y colapsa los saltos— se lee igual de bien
 * en una sola línea, porque los numerales hacen de separador. Si algún día
 * cambia el formato, probarlo en los dos lados.
 */
export function textoDeCarta(seleccion: Seleccion, momento: Momento): string {
  const platos = platosDeCarta(seleccion)
  if (!platos.length) return ''

  const lineas = platos.map((d, i) =>
    // "Que elija el chef" no lleva bajada: su nota le habla al cliente ("tu
    // mesa"), y en el email del chef sonaría al revés.
    d.chefChoice
      ? `${romano(i)} · Que elija el chef`
      : `${romano(i)} · ${d.name} (${d.note})`
  )

  return [
    `Mi carta para ${MOMENTO_LABEL[momento]}:`,
    ...lineas,
    // La raya no es adorno: los numerales separan los platos entre sí, pero al
    // colapsarse los saltos en el email este cierre se pegaba al último plato
    // ("Que elija el chef Es lo que nos tienta...").
    '— Es lo que nos tienta, no un pedido cerrado: contamos con tu criterio.',
  ].join('\n')
}

/** Handoff al wizard: tipo de servicio 1, momento, carta, ocasión y origen. */
export function buildCartaWizardUrl(
  seleccion: Seleccion,
  momento: Momento,
  occasion: string
): string {
  const ids = platosDeCarta(seleccion).map((d) => d.id)
  const p = new URLSearchParams()
  p.set('service', '1')
  p.set('meal', momento)
  if (ids.length) p.set('menu', ids.join(','))
  if (occasion) p.set('occasion', occasion)
  p.set('source', 'menu_builder')
  return `/wizard?${p.toString()}`
}

// ── Lectura desde la URL (lado wizard) ───────────────────────────────────────

export const parseMomento = (raw: string | null): Momento | undefined =>
  raw === 'lunch' || raw === 'dinner' ? raw : undefined

/**
 * Reconstruye la selección desde `?menu=`. La URL es entrada de usuario: se
 * descartan ids desconocidos, platos que no se sirven en ese momento y repetidos
 * del mismo tiempo (gana el primero). Sin esto, un link manipulado sembraría en
 * la solicitud del chef una carta que no existe.
 */
export function parseSeleccion(raw: string | null, momento: Momento): Seleccion {
  if (!raw) return {}
  const seleccion: Seleccion = {}
  for (const id of raw.split(',').slice(0, COURSE_ORDER.length * 2)) {
    const dish = dishById(id.trim())
    if (!dish) continue
    if (!dish.momentos.includes(momento)) continue
    if (seleccion[dish.course]) continue
    seleccion[dish.course] = dish.id
  }
  return seleccion
}
