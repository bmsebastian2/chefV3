import citiesJson from '../../../public/maps/data/nicaragua-cities.json'
import { normalizeCity } from './normalizeCity'

/** Una ciudad del catálogo estático de Nicaragua. */
export type CityEntry = {
  name: string
  department: string
  /** Coincide con `properties.id` del geojson de departamentos. */
  departmentId: string
  lat: number
  lng: number
}

/**
 * Catálogo de ciudades indexado por clave normalizada (minúscula, sin tildes).
 * Las claves del JSON ya vienen normalizadas con la misma convención que
 * `normalizeCity`, así que el match contra `chef_profiles.city` es directo.
 */
export const CITIES = citiesJson.cities as Record<string, CityEntry>

/**
 * Nombres alternativos → clave canónica del catálogo. Cubren las diferencias
 * de `country-state-city` (la fuente del `city` del chef) frente a nuestras
 * claves. Las claves de este mapa también van normalizadas.
 */
export const CITY_ALIASES: Record<string, string> = {
  bilwi: 'puerto cabezas',          // Puerto Cabezas se conoce como Bilwi
  'puerto cabezas (bilwi)': 'puerto cabezas',
  ometepe: 'moyogalpa',             // isla de Ometepe → su cabecera principal
  'isla de ometepe': 'moyogalpa',
}

/** Resultado de resolver un `city` crudo contra el catálogo. */
export type ResolvedCity = { key: string; entry: CityEntry }

/**
 * Resuelve un `city` crudo (de `chef_profiles.city` o `service_requests.city`)
 * a una entrada del catálogo: primero por clave normalizada, luego por alias.
 * Devuelve `null` si no hay match → el llamador aplica el fallback
 * "Otras ciudades".
 */
export function resolveCity(rawCity: string | null | undefined): ResolvedCity | null {
  const key = normalizeCity(rawCity)
  if (!key) return null

  if (CITIES[key]) return { key, entry: CITIES[key] }

  const aliasKey = CITY_ALIASES[key]
  if (aliasKey && CITIES[aliasKey]) return { key: aliasKey, entry: CITIES[aliasKey] }

  return null
}
