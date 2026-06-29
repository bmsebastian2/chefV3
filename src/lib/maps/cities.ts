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

  // Departamento → su cabecera, cuando NO coinciden de nombre. El geocoder a veces
  // devuelve el departamento en vez de la ciudad; `normalizeCity` ya le quitó el
  // prefijo "departamento de", así que acá llega la clave pelada del departamento.
  // Los departamentos homónimos de su capital (managua, leon, granada, masaya,
  // rivas, esteli, chinandega, matagalpa, jinotega, boaco) NO necesitan alias:
  // el strip de prefijo los deja en una clave que ya existe en el catálogo.
  carazo:           'jinotepe',
  chontales:        'juigalpa',
  madriz:           'somoto',
  'nueva segovia':  'ocotal',
  'rio san juan':   'san carlos',
  raccn:            'puerto cabezas',   // Caribe Norte → Bilwi/Puerto Cabezas
  'costa caribe norte': 'puerto cabezas',
  raccs:            'bluefields',       // Caribe Sur → Bluefields
  'costa caribe sur':   'bluefields',
}

/** Una opción de ciudad para selectores: clave normalizada + nombre para mostrar. */
export type CityOption = { key: string; name: string }

/**
 * Países que tienen catálogo de ciudades normalizado. Hoy solo Nicaragua; el
 * matching por ciudades adicionales solo se ofrece para estos. Las claves van
 * normalizadas (minúsculas, sin tildes) para tolerar "Nicaragua" / "nicaragua".
 * A futuro: sumar más países → su propio JSON + entrada acá.
 */
const COUNTRY_CATALOGS: Record<string, Record<string, CityEntry>> = {
  nicaragua: CITIES,
}

/**
 * Lista de ciudades del catálogo de un país, ordenada alfabéticamente por nombre.
 * Pensada para poblar selectores (ciudad base + ciudades adicionales del chef).
 * Devuelve `null` si el país no tiene catálogo → el llamador oculta la función
 * de ciudades adicionales y cae al selector genérico.
 *
 * Acepta el nombre completo ("Nicaragua") o el código ISO ("NI").
 */
export function getCatalogCities(country: string | null | undefined): CityOption[] | null {
  if (!country) return null
  const key = normalizeCity(country)
  const catalog =
    (key && COUNTRY_CATALOGS[key]) ||
    (key === 'ni' ? CITIES : undefined) // tolera el ISO de Nicaragua
  if (!catalog) return null

  return Object.entries(catalog)
    .map(([cityKey, entry]) => ({ key: cityKey, name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** ¿El país tiene catálogo de ciudades? (habilita las ciudades adicionales). */
export function countryHasCatalog(country: string | null | undefined): boolean {
  return getCatalogCities(country) !== null
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

/**
 * Valor CANÓNICO de ciudad para PERSISTIR (en `service_requests.city` y
 * `chef_profiles.city`). Fuente de verdad única del guardado: ambos lados del
 * matching deben pasar por acá para almacenar lo mismo.
 *
 * - País con catálogo (hoy Nicaragua) y ciudad reconocida → nombre de display
 *   del catálogo ("Managua", "León") — bonito para mostrar y clave exacta al
 *   normalizar en el matching.
 * - Sin catálogo o ciudad no reconocida → el valor crudo limpio de dígitos en los
 *   bordes; el matching lo reduce con `normalizeCity` al comparar (idempotente).
 *
 * Devuelve `null` si la entrada queda vacía.
 */
export function canonicalCity(
  rawCity: string | null | undefined,
  country: string | null | undefined
): string | null {
  if (!rawCity) return null

  if (countryHasCatalog(country)) {
    const resolved = resolveCity(rawCity)
    if (resolved) return resolved.entry.name
  }

  return rawCity.replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim() || null
}
