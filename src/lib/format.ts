// Formateo de precios centralizado. Todos los montos de la plataforma están en USD.
// Mantener un único formateador evita que el símbolo / moneda se desincronicen entre
// el checkout, las vistas de propuesta y los emails.

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

/** "$50,000 USD" */
export function formatPrice(amount: number): string {
  return `${usd.format(amount)} USD`
}

/** "$300 – $500 USD" */
export function formatPriceRange(min: number, max: number): string {
  return `${usd.format(min)} – ${usd.format(max)} USD`
}
