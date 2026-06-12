// Tipos y labels del asistente de búsqueda de chefs.
// Se mantienen fuera de actions.ts porque un módulo 'use server'
// solo puede exportar funciones async.

// ─── Labels de cocina (mismo set que usa el wizard) ───────────────────────────
export const CUISINE_LABELS: Record<string, string> = {
  local:         'Local',
  italian:       'Italiana',
  mediterranean: 'Mediterránea',
  seafood:       'Mariscos',
  french:        'Francesa',
  japanese:      'Japonesa',
  fusion:        'Fusión',
  chefs_special: 'Sorpresa del chef',
}

export function cuisineLabel(value: string): string {
  return CUISINE_LABELS[value] ?? value
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type AssistantCuisine = {
  value: string
  label: string
  count: number
}

export type ChefResult = {
  chefId: string
  fullName: string
  tagline: string | null
  city: string | null
  ratingAvg: number
  totalServices: number
  photoUrl: string | null
  cuisines: string[]
  matchLevel: number
}

export type MatchFilters = {
  serviceType?: 'single' | 'multiple' | 'weekly' | null
  cuisine?: string | null
  guests?: number | null
}

export type MatchResult = {
  chefs: ChefResult[]
  /** 0 = match exacto · 1 = sin cocina · 2 = sin personas · 3 = todos los activos */
  matchLevel: number
  /** true si hubo que relajar algún filtro para encontrar resultados */
  relaxed: boolean
}
