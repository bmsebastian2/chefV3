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
export const REQUEST_SELECT =
  'id, service_type, status, event_date_start, event_time, location, city, ' +
  'guests_adults, guests_teens, guests_kids, cuisine_type, occasion, ' +
  'budget_min, budget_max, created_at'

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
}

export type RequestsPayload = {
  requests: ClientRequest[]
  proposalCounts: Record<string, number>
}
