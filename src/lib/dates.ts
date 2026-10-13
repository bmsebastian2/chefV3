// Fechas de calendario (día del servicio) como texto 'YYYY-MM-DD' de punta a punta.
// Un Date es un instante, no un día: si viaja del navegador al servidor, el
// servidor (UTC) recalcula el día en su zona y lo corre para quien elige desde
// UTC+ (ej. un cliente en España elige el 31 y se guardaba el 30). Por eso el día
// se fija como texto en el navegador, en el momento del clic, y ya no se convierte.
// Las columnas son `date` en Postgres: el texto entra y sale tal cual.

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

/** Día local de un Date (el que el usuario vio en el calendario) → 'YYYY-MM-DD'. */
export function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' → medianoche local. Solo para pintar calendarios y formatear, nunca para guardar. */
export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Formato exacto y día real del calendario (rechaza '2026-02-30'). */
export function isValidYMD(value: unknown): value is string {
  return typeof value === 'string' && YMD_RE.test(value) && toYMD(fromYMD(value)) === value
}
