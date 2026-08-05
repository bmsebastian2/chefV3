// Chips/rows compartidos entre la card del chef (RequestsView) y la del
// cliente (client-dashboard/RequestCard). Cada card normaliza sus datos
// crudos (jsonb del RPC del lado chef, arrays embebidos de PostgREST del
// lado cliente) a estas mismas formas antes de renderizar.

import { Sunrise, Sun, Moon, Repeat } from 'lucide-react'

export type DietaryFlags = {
  vegetariano: boolean | null
  vegano: boolean | null
  sin_gluten: boolean | null
  sin_lactosa: boolean | null
  sin_mariscos: boolean | null
  sin_frutos_secos: boolean | null
  alergias_adicionales: string | null
  notas_adicionales: string | null
} | null

export type MealMoments = {
  desayuno: boolean | null
  almuerzo: boolean | null
  cena: boolean | null
} | null

export type WeeklySummary = {
  comidas_por_semana: number | null
  raciones_por_comida: number | null
} | null

const RESTRICTION_LABELS: [keyof NonNullable<DietaryFlags>, string][] = [
  ['vegetariano', 'Vegetariano'],
  ['vegano', 'Vegano'],
  ['sin_gluten', 'Sin gluten'],
  ['sin_lactosa', 'Sin lactosa'],
  ['sin_mariscos', 'Sin mariscos'],
  ['sin_frutos_secos', 'Sin frutos secos'],
]

function activeRestrictionLabels(restrictions: DietaryFlags): string[] {
  if (!restrictions) return []
  return RESTRICTION_LABELS.filter(([key]) => restrictions[key] === true).map(([, label]) => label)
}

// Única fuente de verdad de "hay algo que mostrar" — la usan tanto DietaryChips
// como las cards, para no dejar un contenedor con borde vacío cuando no hay
// restricciones ni texto libre cargado.
export function hasDietaryContent(restrictions: DietaryFlags): boolean {
  if (!restrictions) return false
  return activeRestrictionLabels(restrictions).length > 0
    || !!restrictions.alergias_adicionales
    || !!restrictions.notas_adicionales
}

function FacetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1.5">
      {children}
    </p>
  )
}

export function DietaryChips({ restrictions }: { restrictions: DietaryFlags }) {
  if (!hasDietaryContent(restrictions)) return null

  const activeLabels = activeRestrictionLabels(restrictions)
  const note = [restrictions?.alergias_adicionales, restrictions?.notas_adicionales]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <FacetLabel>Restricciones</FacetLabel>
      {activeLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeLabels.map((label) => (
            <span
              key={label}
              className="text-[11px] font-medium bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      {note && (
        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{note}</p>
      )}
    </div>
  )
}

const MOMENT_ICONS: [keyof NonNullable<MealMoments>, string, React.ElementType][] = [
  ['desayuno', 'Desayuno', Sunrise],
  ['almuerzo', 'Almuerzo', Sun],
  ['cena', 'Cena', Moon],
]

export function hasMealMoments(moments: MealMoments, serviceType: string): boolean {
  if (!moments || serviceType === 'single') return false
  return MOMENT_ICONS.some(([key]) => moments[key] === true)
}

// Solo tiene sentido para 'multiple'/'weekly': en 'single' el momento ya está
// implícito en event_time, mostrarlo acá sería ruido repetido.
export function MealMomentIcons({ moments, serviceType }: { moments: MealMoments; serviceType: string }) {
  if (!hasMealMoments(moments, serviceType)) return null

  const active = MOMENT_ICONS.filter(([key]) => moments![key] === true)

  return (
    <div>
      <FacetLabel>Momentos</FacetLabel>
      <div className="flex items-center gap-2">
        {active.map(([key, label, Icon]) => (
          <span key={key} title={label} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-50 text-zinc-400">
            <Icon className="w-3.5 h-3.5" />
          </span>
        ))}
      </div>
    </div>
  )
}

export function hasWeeklySummary(weekly: WeeklySummary): boolean {
  return !!weekly && (!!weekly.comidas_por_semana || !!weekly.raciones_por_comida)
}

export function WeeklySummaryRow({ weekly }: { weekly: WeeklySummary }) {
  if (!hasWeeklySummary(weekly)) return null
  const { comidas_por_semana, raciones_por_comida } = weekly!

  const parts: string[] = []
  if (comidas_por_semana) parts.push(`${comidas_por_semana}x/semana`)
  if (raciones_por_comida) parts.push(`${raciones_por_comida} racion${raciones_por_comida !== 1 ? 'es' : ''}/comida`)

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-300 shrink-0"><Repeat className="w-3 h-3" /></span>
      <span className="text-xs text-zinc-500 truncate">{parts.join(' · ')}</span>
    </div>
  )
}

// Punto único de entrada para las cards: decide visibilidad y agrupa las tres
// piezas bajo un mismo contenedor. Evita duplicar el chequeo "hay algo que
// mostrar" y el wrapper con borde en cada card.
export function hasAnyFacets(
  restrictions: DietaryFlags,
  mealMoments: MealMoments,
  weekly: WeeklySummary,
  serviceType: string,
): boolean {
  return hasDietaryContent(restrictions) || hasMealMoments(mealMoments, serviceType) || hasWeeklySummary(weekly)
}

export function RequestFacets({ restrictions, mealMoments, weekly, serviceType }: {
  restrictions: DietaryFlags
  mealMoments:  MealMoments
  weekly:       WeeklySummary
  serviceType:  string
}) {
  if (!hasAnyFacets(restrictions, mealMoments, weekly, serviceType)) return null

  return (
    <div className="border-t border-zinc-50 px-4 py-3 space-y-3">
      <DietaryChips restrictions={restrictions} />
      <MealMomentIcons moments={mealMoments} serviceType={serviceType} />
      <WeeklySummaryRow weekly={weekly} />
    </div>
  )
}
