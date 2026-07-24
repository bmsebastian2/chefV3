// ============================================================================
// Precios — ÚNICA fuente de verdad. No inventar valores fuera de este archivo.
//
// ── Tabla oficial (USD por persona, bracket × tier) ─────────────────────────
//
//   Bracket        Casual        Gourmet       Selección Exclusiva
//   2 personas     210 – 263     263 – 315     315 – 420
//   3 a 6          189 – 231     231 – 273     273 – 336
//   7 o más        147 – 189     189 – 231     231 – 294
//
// Propiedades del modelo:
//  · Es una MATRIZ de valores definidos — nunca derivar por fórmula ni factor
//    (la fila de 2 personas no sigue los saltos de las otras dos).
//  · Tiers contiguos: el máx de un tier es el mín del siguiente en cada fila.
//    Las cards de presupuesto del wizard encadenan visualmente gracias a esto.
//  · "7 o más" es el ÚLTIMO bracket e INCLUYE el 7: piso — de 7 personas en
//    adelante el por-persona se congela; agregar personas sube el total,
//    nunca baja el por-persona.
//
// El chef define en su menú un precio por persona para cada bracket, acotado
// por los extremos de su fila (mín Casual → máx Exclusiva, menuPriceBounds).
// El precio de una propuesta es el del bracket donde caen los comensales del
// request. La tabla rige hacia adelante: montos ya guardados en requests o
// bookings existentes no se recalculan con ella.
//
// ── Re-precio en la reserva ─────────────────────────────────────────────────
//    La propuesta guarda un snapshot del menú (proposals.price_2/3_6/7_20,
//    ver MIGRATION_proposal_price_snapshot.sql). Cambiar comensales busca el
//    precio del bracket nuevo EN ESE SNAPSHOT — nunca se inventa un precio
//    que el chef no definió. Sin snapshot (propuestas históricas o sin menú),
//    el precio queda fijo.
// ============================================================================

export type PriceTier = 'casual' | 'gourmet' | 'exclusive';
export type GuestBracket = '2' | '3_6' | '7_plus';
export type PriceRange = { min: number; max: number };

/** La tabla oficial, celda por celda. NO derivar valores: editar acá. */
export const PRICE_TABLE: Record<GuestBracket, Record<PriceTier, PriceRange>> = {
  '2': {
    casual:    { min: 210, max: 263 },
    gourmet:   { min: 263, max: 315 },
    exclusive: { min: 315, max: 420 },
  },
  '3_6': {
    casual:    { min: 189, max: 231 },
    gourmet:   { min: 231, max: 273 },
    exclusive: { min: 273, max: 336 },
  },
  '7_plus': {
    casual:    { min: 147, max: 189 },
    gourmet:   { min: 189, max: 231 },
    exclusive: { min: 231, max: 294 },
  },
};

export const TIER_ORDER: readonly PriceTier[] = ['casual', 'gourmet', 'exclusive'];

/** Labels de tier para UI. */
export const TIER_LABELS: Record<PriceTier, string> = {
  casual:    'Casual',
  gourmet:   'Gourmet',
  exclusive: 'Selección Exclusiva',
};

/** Labels de bracket para UI. El último es "7 o más" — nunca "7–20". */
export const BRACKET_LABELS: Record<GuestBracket, string> = {
  '2':      '2 personas',
  '3_6':    '3–6 personas',
  '7_plus': '7 o más personas',
};

/** Bracket donde caen N comensales. Único corte válido: ≤2 · 3–6 · ≥7. */
export function getBracket(guests: number): GuestBracket {
  if (guests <= 2) return '2';
  if (guests <= 6) return '3_6';
  return '7_plus';
}

/** Rango oficial (min–max por persona) de un tier para N comensales. */
export function getPriceRange(tier: PriceTier, guests: number): PriceRange {
  return PRICE_TABLE[getBracket(guests)][tier];
}

/**
 * Bordes de validación del precio que el chef carga por bracket en su menú:
 * del mín Casual al máx Exclusiva de la fila.
 */
export function menuPriceBounds(bracket: GuestBracket): PriceRange {
  const row = PRICE_TABLE[bracket];
  return { min: row.casual.min, max: row.exclusive.max };
}

/**
 * Tier reconocido por el rango exacto guardado en budget_min/budget_max
 * (el tier no se persiste como columna). Cubre las 9 celdas de la tabla;
 * rangos históricos que ya no existen devuelven null.
 */
export function tierFromBudget(min: number, max: number): PriceTier | null {
  for (const bracket of Object.keys(PRICE_TABLE) as GuestBracket[]) {
    for (const tier of TIER_ORDER) {
      const r = PRICE_TABLE[bracket][tier];
      if (r.min === min && r.max === max) return tier;
    }
  }
  return null;
}

/**
 * Mínimo de comensales de una reserva: el menor bracket definido es "2".
 * El máximo es MAX_EVENT_GUESTS (topes del stepper, re-exportados abajo).
 */
export const MIN_BOOKING_GUESTS = 2;

// Topes del stepper de personas del evento puntual. Viven en wizard/types
// (los usa el wizard entero); se re-exportan para que el consumo de precios
// tenga un único punto de import.
export { MIN_EVENT_GUESTS, MAX_EVENT_GUESTS } from '@/components/wizard/types';

/**
 * Celda (bracket, tier) que coincide con el presupuesto de un request PARA SUS
 * comensales. El bracket lo fija getBracket(guests): así se desambigua el raro
 * caso de rangos repetidos entre brackets (ej. 189–231 = 3–6/casual y también
 * 7+/gourmet) — dentro de un mismo bracket las tres celdas son distintas.
 *
 * Devuelve null si el rango no coincide con NINGUNA celda de ese bracket:
 *   · requests históricos con rangos que ya no existen en la tabla, o
 *   · datos inconsistentes (budget guardado para un bracket ≠ el de los guests).
 * En ambos casos no hay un tier confiable que imponer → el caller cae al
 * fallback (precio libre del menú), nunca a un rango inventado.
 */
export function cellFromBudget(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  guests: number,
): { bracket: GuestBracket; tier: PriceTier } | null {
  if (budgetMin == null || budgetMax == null) return null;
  const bracket = getBracket(guests);
  const min = Number(budgetMin);
  const max = Number(budgetMax);
  for (const tier of TIER_ORDER) {
    const r = PRICE_TABLE[bracket][tier];
    if (r.min === min && r.max === max) return { bracket, tier };
  }
  return null;
}

/**
 * Rango dentro del cual el chef puede cotizar una propuesta: la celda
 * tier × bracket de la tabla oficial para el request (== [budget_min, budget_max]
 * cuando el presupuesto matchea una celda de ese bracket). null → fallback,
 * ver cellFromBudget.
 */
export function proposalPriceRange(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  guests: number,
): PriceRange | null {
  const cell = cellFromBudget(budgetMin, budgetMax, guests);
  return cell ? PRICE_TABLE[cell.bracket][cell.tier] : null;
}

/**
 * Snapshot de re-precio de una propuesta cotizada por tier: el precio elegido
 * por el chef, proyectado a los TRES brackets de la fila del tier conservando
 * su posición relativa dentro del rango (elegir el mínimo del bracket cotizado
 * da el mínimo de los otros; el máximo, el máximo). Así, si el cliente cambia
 * los comensales en la reserva, el re-precio cae siempre dentro del tier y
 * respeta la monotonía (las filas de la tabla decrecen por bracket).
 *
 * Los bordes salen de PRICE_TABLE — acá no nace ningún precio nuevo, solo la
 * posición del chef aplicada a los rangos oficiales, redondeada a dólar entero.
 */
export function proposalSnapshotForTier(tier: PriceTier, chosenPrice: number, guests: number): MenuPrices {
  const chosen = PRICE_TABLE[getBracket(guests)][tier];
  const clamped = Math.min(Math.max(chosenPrice, chosen.min), chosen.max);
  const t = (clamped - chosen.min) / (chosen.max - chosen.min);
  const project = (r: PriceRange) => Math.round(r.min + t * (r.max - r.min));
  return {
    price_2:    project(PRICE_TABLE['2'][tier]),
    price_3_6:  project(PRICE_TABLE['3_6'][tier]),
    price_7_20: project(PRICE_TABLE['7_plus'][tier]),
  };
}

/** Precios por bracket de un menú del chef (snapshot en la propuesta). */
export type MenuPrices = {
  price_2:    number | null;
  price_3_6:  number | null;
  price_7_20: number | null;
};

// Columna del menú que corresponde a cada bracket. El nombre price_7_20 es
// histórico (la columna de DB se llama así); el bracket es "7 o más".
const MENU_FIELD_BY_BRACKET: Record<GuestBracket, keyof MenuPrices> = {
  '2':      'price_2',
  '3_6':    'price_3_6',
  '7_plus': 'price_7_20',
};

/**
 * Precio por persona para N comensales según los brackets del menú (piso:
 * 7, 20 o 25 personas pagan lo mismo por cabeza). Misma lógica que usa el
 * chef al proponer (RequestsView). Devuelve null si el bracket no tiene precio.
 */
export function priceForGuests(prices: MenuPrices, guests: number): number | null {
  const price = prices[MENU_FIELD_BY_BRACKET[getBracket(guests)]];
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;
}

/**
 * Re-precia una propuesta cuando cambia la cantidad de comensales.
 *
 * Con snapshot del menú → precio real del chef para el bracket nuevo.
 * Sin snapshot, o si el bracket nuevo no tiene precio → el precio cotizado
 * queda FIJO (nunca se inventa). Devuelve null solo ante entradas sin sentido
 * (precio o comensales no positivos) para que el caller corte el flujo, igual
 * que computeTotal en payment-guards.
 */
export function repriceProposal(
  proposalPricePerPerson: number,
  snapshot: MenuPrices | null,
  guests: number,
): number | null {
  if (
    !Number.isFinite(proposalPricePerPerson) || proposalPricePerPerson <= 0 ||
    !Number.isInteger(guests) || guests <= 0
  ) {
    return null;
  }
  if (snapshot) {
    const bracketPrice = priceForGuests(snapshot, guests);
    if (bracketPrice !== null) return bracketPrice;
  }
  return proposalPricePerPerson;
}

/**
 * Comensales del request cuando el chef cotizó — valor inicial del stepper de
 * reserva. El tronco unificado guarda personas exactas en guests_*;
 * cuantas_personas (columna calculada = suma de guests_*, pero presente sola
 * en requests viejos) queda como fallback. Último recurso: 2 (bracket base) —
 * nunca devuelve 0.
 */
export function originalGuestsFromRequest(request: {
  guests_adults?:    number | null;
  guests_teens?:     number | null;
  guests_kids?:      number | null;
  cuantas_personas?: number | null;
}): number {
  const exact =
    (request.guests_adults ?? 0) +
    (request.guests_teens  ?? 0) +
    (request.guests_kids   ?? 0);
  if (exact > 0) return exact;
  const fallback = request.cuantas_personas ?? 0;
  return fallback > 0 ? fallback : MIN_BOOKING_GUESTS;
}
