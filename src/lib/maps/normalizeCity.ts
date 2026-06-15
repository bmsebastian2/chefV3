/**
 * Normaliza un nombre de ciudad/departamento para usarlo como clave de búsqueda
 * contra `nicaragua-cities.json` (cuyas claves están en minúscula y sin tildes).
 *
 * Pasos: recorta → quita dígitos en los bordes (igual que el wizard, ej. "12 Managua")
 * → minúsculas → descompone y elimina diacríticos (NFD) → colapsa espacios.
 *
 * Devuelve `null` si la entrada queda vacía, para que el llamador pueda aplicar
 * el fallback "Otras ciudades".
 */
export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null

  const normalized = city
    .replace(/^\d+\s+/, '')        // dígitos al inicio: "12 Managua" → "Managua"
    .replace(/\s+\d+$/, '')        // dígitos al final:  "Managua 12" → "Managua"
    .trim()
    .toLowerCase()
    .normalize('NFD')              // separa los acentos de sus letras base
    .replace(/[̀-ͯ]/g, '') // elimina los diacríticos combinantes (U+0300–U+036F)
    .replace(/\s+/g, ' ')          // colapsa espacios internos
    .trim()

  return normalized || null
}
