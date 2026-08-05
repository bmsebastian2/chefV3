// Estados, columnas y tipos compartidos de las solicitudes del cliente.
// Módulo plano (sin 'use server'): lo consumen tanto el server (page.tsx,
// actions.ts) como los Client Components (RequestsTabs, RequestCard).

// Una solicitud "activa" es toda la que no está completada ni cancelada
// (incluye `booked` = pagada/en escrow, que el cliente debe ver al entrar).
export const REQUEST_STATUS_GROUPS = {
  activas:      ['new', 'active', 'pending', 'pending_confirmation', 'booked'],
  completadas:  ['completed'],
  canceladas:   ['cancelled'],
} as const

export type RequestGroup = keyof typeof REQUEST_STATUS_GROUPS

// Máximo de solicitudes por pestaña (paginación simple).
export const REQUESTS_PAGE_SIZE = 14

// Columnas que rendea la tarjeta. Mantener en sync con RequestCard.
// request_restrictions/weekly_meal_details son 1:1 (request_id UNIQUE) —
// PostgREST detecta el constraint y los embebe como OBJETO único (null si no
// hay fila), no como array. Verificado contra la base real: un `[0]` sobre
// esto siempre da undefined. request_dates es 1:muchos (sin constraint único)
// y sí llega como array; solo se piden los booleans porque la card agrega,
// no desglosa por día.
export const REQUEST_SELECT =
  'id, service_type, status, event_date_start, event_time, location, city, ' +
  'guests_adults, guests_teens, guests_kids, cuisine_type, occasion, ' +
  'budget_min, budget_max, created_at, ' +
  'request_restrictions(vegetariano, vegano, sin_gluten, sin_lactosa, sin_mariscos, sin_frutos_secos, alergias_adicionales, notas_adicionales), ' +
  'request_dates(desayuno, almuerzo, cena), ' +
  'weekly_meal_details(comidas_por_semana, raciones_por_comida, frecuencia_cocina)'

export type RequestRestrictions = {
  vegetariano: boolean
  vegano: boolean
  sin_gluten: boolean
  sin_lactosa: boolean
  sin_mariscos: boolean
  sin_frutos_secos: boolean
  alergias_adicionales: string | null
  notas_adicionales: string | null
}

export type RequestMealSlot = {
  desayuno: boolean
  almuerzo: boolean
  cena: boolean
}

export type RequestWeeklyDetails = {
  comidas_por_semana: number | null
  raciones_por_comida: number | null
  frecuencia_cocina: string | null
}

export type ClientRequest = {
  id: string
  service_type: string
  status: string
  event_date_start: string | null
  event_time: string | null
  location: string | null
  city: string | null
  guests_adults: number | null
  guests_teens: number | null
  guests_kids: number | null
  cuisine_type: string | null
  occasion: string | null
  budget_min: number | string | null
  budget_max: number | string | null
  created_at: string
  request_restrictions: RequestRestrictions | null
  request_dates: RequestMealSlot[] | null
  weekly_meal_details: RequestWeeklyDetails | null
}

export type RequestsPayload = {
  requests: ClientRequest[]
  proposalCounts: Record<string, number>
}
