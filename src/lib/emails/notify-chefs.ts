'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { resend, FROM_EMAIL, REPLY_TO, resolveRecipient, testSubjectPrefix } from '@/lib/resend'
import { normalizeCity } from '@/lib/maps/normalizeCity'
import { tierFromBudget, type PriceTier } from '@/lib/pricing'
import { emailFooter, ctaBand, detailBlock, EMAIL_RESPONSIVE_STYLES } from './shared'

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Servicio Único',
  multiple: 'Servicio Múltiple',
  weekly:   'Servicio Semanal',
}

const OCCASION_LABELS: Record<string, string> = {
  birthday:          'Cumpleaños',
  family_reunion:    'Reunión Familiar',
  bachelor_party:    'Despedida de Soltero/a',
  friends_gathering: 'Reunión con Amigos',
  romantic_dinner:   'Cena Romántica',
  corporate:         'Evento Corporativo',
  gastronomic:       'Aventura Gastronómica',
  other:             'Otro',
}

// El tier no se persiste como columna: se reconoce por el rango exacto de
// budget_min/budget_max contra la tabla oficial (tierFromBudget, lib/pricing).
// Requests con rangos históricos que ya no están en la tabla quedan sin label.
const TIER_DISPLAY: Record<PriceTier, string> = {
  casual:    'Casual',
  gourmet:   'Gourmet',
  exclusive: 'Exclusivo',
}

// Mismos labels que CUISINE_DISPLAY del wizard (email del cliente)
const CUISINE_LABELS: Record<string, string> = {
  local:          'Local',
  mediterranean:  'Mediterránea',
  french:         'Francesa',
  fusion:         'Fusión',
  italian:        'Italiana',
  seafood:        'Mariscos/Pescados',
  japanese:       'Japonesa',
  chefs_special:  'A elección del Chef',
}

// Perforado "sello postal" arriba y abajo del card — círculos recortados a
// la mitad con overflow:hidden, sin depender de ninguna imagen ni gradiente
// (mismo truco que client-emails.ts).
const SCALLOP_DIAMETER = 16
const SCALLOP_COUNT    = 35 // 35 × 16 = 560, el ancho del card

function scallopRow(flip: boolean, color: string): string {
  const dots = Array.from({ length: SCALLOP_COUNT }).map(() => `
                <td width="${SCALLOP_DIAMETER}" style="line-height:0;font-size:0;">
                  <div style="width:${SCALLOP_DIAMETER}px;height:${SCALLOP_DIAMETER}px;border-radius:50%;background:${color};box-shadow:inset 0 0 0 1px rgba(24,24,27,0.08), inset 0 2px 3px rgba(24,24,27,0.12);"></div>
                </td>`).join('')

  return `
        <tr>
          <td height="${SCALLOP_DIAMETER / 2}" style="height:${SCALLOP_DIAMETER / 2}px;overflow:hidden;line-height:0;font-size:0;">
            <table width="${SCALLOP_COUNT * SCALLOP_DIAMETER}" cellpadding="0" cellspacing="0"${flip ? ` style="margin-top:-${SCALLOP_DIAMETER / 2}px;"` : ''}>
              <tr>${dots}</tr>
            </table>
          </td>
        </tr>`
}

// Fondo crema del card ("mate" alrededor del contenido, como un sello/ticket
// real). El perforado de arriba/abajo revela este mismo color de página
// (#FAFAFA se mantiene detrás, sin cambios en el resto del sitio).
const CARD_BG = '#F5F0E3'

// Dorado — acento premium para labels, chip y detalles finos. No reemplaza
// el verde de marca (CTA, checks): conviven, el dorado es solo ornamento.
const GOLD = '#B8935B'

const SCALLOP_TOP_ROW    = scallopRow(true, '#FAFAFA')
const SCALLOP_BOTTOM_ROW = scallopRow(false, '#FAFAFA')

// Sello circular con texto en arco — vía SVG inline + <textPath>. Es la única
// forma de lograr texto curvo en HTML, pero el soporte de SVG inline en
// email es disparejo (Gmail lo renderiza en general; Outlook desktop no).
// Si no carga, no rompe nada: el chip de tierBadge ya comunica lo mismo.
function sealBadge(topText: string, bottomText: string): string {
  return `
    <svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg">
      <circle cx="46" cy="46" r="41" fill="none" stroke="${GOLD}" stroke-width="1" stroke-dasharray="2,3"/>
      <circle cx="46" cy="46" r="34" fill="${CARD_BG}"/>
      <path id="sealTop" d="M 8,46 A 38,38 0 1,1 84,46" fill="none"/>
      <path id="sealBottom" d="M 8,46 A 38,38 0 1,0 84,46" fill="none"/>
      <text font-size="7.5" font-weight="700" fill="${GOLD}" letter-spacing="1.5">
        <textPath href="#sealTop" startOffset="50%" text-anchor="middle">${topText}</textPath>
      </text>
      <text font-size="7.5" font-weight="700" fill="${GOLD}" letter-spacing="1.5">
        <textPath href="#sealBottom" startOffset="50%" text-anchor="middle">${bottomText}</textPath>
      </text>
      <text x="46" y="53" font-size="20" text-anchor="middle">👨‍🍳</text>
    </svg>`
}

// ── HTML shell (idéntico al de client-emails) ─────────────────────────────────
function shell(body: string, subtitle: string = 'Nueva solicitud de servicio'): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${EMAIL_RESPONSIVE_STYLES}</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:'Helvetica Neue',Arial,sans-serif;color:#18181B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(24,24,27,0.12);">
        ${SCALLOP_TOP_ROW}
        <tr>
          <td style="background:#18181B;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:28px 16px 28px 32px;" valign="middle">
                <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#22c55e;letter-spacing:-0.5px;">GetChef</p>
                <div style="height:1px;font-size:0;line-height:1px;margin:0 0 12px;background:rgba(184,147,91,0.4);">&nbsp;</div>
                <p style="margin:0;font-size:13px;color:${GOLD};">${subtitle}</p>
              </td>
              <td width="200" style="padding:0;line-height:0;font-size:0;">
                <img src="${SITE_URL}/banner-chef.webp" width="200" height="140" style="display:block;width:200px;height:140px;object-fit:cover;" alt="">
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        ${emailFooter('chef')}
        ${SCALLOP_BOTTOM_ROW}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function section(title: string, rows: [string, string | undefined][]): string {
  const valid = rows.filter(([, v]) => v != null && v !== '')
  if (!valid.length) return ''
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #E4E4E7;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#F4F4F5;padding:9px 16px;">
          <p style="margin:0;font-size:10px;font-weight:700;color:#71717A;text-transform:uppercase;letter-spacing:0.08em;">${title}</p>
        </td>
      </tr>
      ${valid.map(([label, value]) => `
      <tr>
        <td style="padding:10px 16px;border-top:1px solid #F4F4F5;">
          <span style="font-size:13px;color:#71717A;">${label}:</span>
          <span style="font-size:13px;color:#18181B;margin-left:6px;font-weight:500;">${value}</span>
        </td>
      </tr>`).join('')}
    </table>`
}

// Chip de la experiencia (tier o tipo de servicio), centrado — lo primero
// que se lee, da contexto de "categoría" antes del detalle línea por línea.
function tierBadge(label: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="border:1px solid ${GOLD};border-radius:20px;padding:7px 18px;background:rgba(184,147,91,0.06);">
            <span style="font-size:11px;font-weight:700;color:${GOLD};letter-spacing:0.06em;text-transform:uppercase;">👑 ${label}</span>
          </td>
        </tr></table>
      </td></tr>
    </table>`
}

// Franja de 4 datos clave en una sola fila, con ícono — los que el chef
// necesita para decidir en 2 segundos si le interesa la solicitud.
function heroGrid(cells: [string, string, string][]): string {
  const n = cells.length
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E4DCC8;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <tr>
        ${cells.map(([icon, label, value], i) => `
        <td width="${Math.floor(100 / n)}%" style="padding:20px 8px;text-align:center;${i > 0 ? 'border-left:1px solid #F0EAD8;' : ''}">
          <div style="width:38px;height:38px;border-radius:50%;background:#F0FDF4;margin:0 auto 8px;">
            <p style="margin:0;line-height:38px;font-size:16px;">${icon}</p>
          </div>
          <p style="margin:0 0 3px;font-size:9px;font-weight:700;color:${GOLD};text-transform:uppercase;letter-spacing:0.06em;">${label}</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#18181B;line-height:1.3;">${value}</p>
        </td>`).join('')}
      </tr>
    </table>`
}

const DAY_NAMES_CHEF: Record<number, string> = {
  1: 'lunes', 2: 'martes', 3: 'miércoles',
  4: 'jueves', 5: 'viernes', 6: 'sábado', 7: 'domingo',
}

// "a" · "a y b" · "a, b y c" — enumeración natural en español.
function joinNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}
const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function buildEmailHtml(chef: string, req: RequestData, clientName: string): string {
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })

  const occasionLabel = OCCASION_LABELS[req.occasion] ?? req.occasion
  const fecha = req.event_date_start ? fmtDate(req.event_date_start) : null
  const isWeekly = req.service_type === 'weekly'

  const badgeLabel = isWeekly
    ? 'Servicio Semanal'
    : (req.experiencia ? `Experiencia ${req.experiencia}` : (SERVICE_TYPE_LABELS[req.service_type] ?? 'Solicitud'))
  const sealWords: [string, string] = isWeekly
    ? ['SERVICIO', 'SEMANAL']
    : req.experiencia
      ? ['EXPERIENCIA', req.experiencia.toUpperCase()]
      : ['NUEVA', 'SOLICITUD']

  const headline = isWeekly
    ? `${clientName} está buscando un chef para su día a día.`
    : `${clientName} te está esperando para su ${occasionLabel.toLowerCase()}.`

  const detailBits = [
    fecha ? `El ${fecha}` : null,
    req.cuantas_personas ? `${req.cuantas_personas} ${req.cuantas_personas === 1 ? 'persona' : 'personas'}` : null,
    req.city ? `en ${req.city}` : null,
  ].filter((bit): bit is string => Boolean(bit))
  const detailLine = detailBits.length ? `${detailBits.join(', ')}.` : null

  const intro = `
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="top">
        <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#18181B;">
          Hola, <em style="font-style:italic;color:${GOLD};">${chef}</em> 👋
        </p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#15803D;line-height:1.4;">
          ${headline}
        </p>
        ${detailLine ? `<p style="margin:0 0 4px;font-size:14px;color:#3F3F46;">${detailLine}</p>` : ''}
        <p style="margin:0;font-size:14px;color:#3F3F46;">
          Entrá, mirá el detalle y mandale una propuesta a la altura.
        </p>
      </td>
      <td width="92" valign="top">${sealBadge(sealWords[0], sealWords[1])}</td>
    </tr></table>
    <div style="margin-top:20px;">&nbsp;</div>`
  const ctaBlock = ctaBand({
    title: `¿Listo para ${req.service_type === 'weekly' ? 'sumarte al día a día de' : 'deleitar a'} ${clientName}${req.service_type !== 'weekly' ? ' y sus invitados' : ''}?`,
    subtitle: 'Revisá la solicitud completa y enviá tu propuesta.',
    buttonLabel: 'Ver solicitud y proponer',
    href: `${SITE_URL}/dashboard/requests`,
  })

  if (req.service_type === 'weekly') {
    const wd = req.weeklyDetails
    const diasArr = wd?.frecuencia_cocina
      ? wd.frecuencia_cocina.split(',').map((n) => n.trim()).filter(Boolean)
      : []
    const frecuenciaLabel = diasArr.length
      ? joinNatural(diasArr.map((n) => DAY_NAMES_CHEF[Number(n)] ?? n))
      : undefined
    const frecuenciaNum = diasArr.length
      ? `${diasArr.length} ${diasArr.length === 1 ? 'día' : 'días'} por semana`
      : undefined

    const momsArr = wd?.momentos
      ? wd.momentos.split(',').map((m) => m.trim()).filter(Boolean)
      : []
    const momentosLabel = momsArr.length ? capFirst(joinNatural(momsArr)) : undefined

    return shell(`${intro}
    <div style="margin-top:8px;">
      ${tierBadge(badgeLabel)}
      ${heroGrid([
        ['📅', 'Fecha de inicio',  req.event_date_start ? fmtDate(req.event_date_start) : '—'],
        ['🔁', 'Frecuencia',       frecuenciaNum ?? '—'],
        ['📍', 'Ciudad',           req.city ?? '—'],
        ['👥', 'Personas/comida',  wd?.raciones_por_comida != null ? String(wd.raciones_por_comida) : '—'],
      ])}
      ${detailBlock([
        ['📅', 'Días',                       frecuenciaLabel],
        ['🕐', 'Momentos por día',           momentosLabel],
        ['🍽️', 'Total de comidas',           wd?.comidas_por_semana != null ? `${wd.comidas_por_semana} comidas semanales` : undefined],
        ['hoja', 'Restricciones alimentarias', req.restricciones ?? undefined],
        ['nota', 'Notas',                      req.descripcion_evento ?? undefined],
      ])}
    </div>
    ${ctaBlock}`, '✨ Una nueva oportunidad')
  }

  // single / multiple — mismo lenguaje visual que el detailsBlock del email
  // del cliente (client-emails.ts), con la ciudad en lugar de la dirección
  // completa (no se expone el lugar exacto antes de reservar).
  const comensales = req.cuantas_personas != null
    ? `${req.cuantas_personas} ${req.cuantas_personas === 1 ? 'persona' : 'personas'}`
    : '—'
  const precioCompacto = req.budget_min && req.budget_max
    ? `$${req.budget_min}–$${req.budget_max}`
    : '—'

  return shell(`${intro}
    <div style="margin-top:8px;">
      ${tierBadge(badgeLabel)}
      ${heroGrid([
        ['📅', 'Fecha',          fecha ?? '—'],
        ['👥', 'Comensales',     comensales],
        ['📍', 'Ciudad',         req.city ?? '—'],
        ['🏷️', 'Precio/persona', precioCompacto],
      ])}
      ${detailBlock([
        ['reloj', 'Hora',                       req.event_time ?? undefined],
        ['cubiertos', 'Preferencias gastronómicas', req.cuisine_type ? (CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type) : undefined],
        ['hoja', 'Restricciones alimentarias', req.restricciones ?? undefined],
        ['party', 'Ocasión',                    occasionLabel],
        ['chef-hat', 'Tipo de servicio',           SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type],
        ['nota', 'Notas',                      req.descripcion_evento ?? undefined],
      ])}
      ${req.mealSlots?.length ? mealSlotsTableChef(req.mealSlots) : ''}
    </div>
    ${ctaBlock}`, '✨ Una nueva oportunidad')
}

const DAYS_ES_CHEF     = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS_ES_CHEF   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function mealSlotsTableChef(slots: MealSlot[]): string {
  const active = slots.filter((s) => s.desayuno || s.almuerzo || s.cena)
  if (!active.length) return ''

  const check = (v: boolean) =>
    v ? `<span style="color:#16A34A;font-weight:700;font-size:15px;">✓</span>`
      : `<span style="color:#D4D4D8;">—</span>`

  const fmtDate = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00')
    return `${DAYS_ES_CHEF[d.getDay()]} ${d.getDate()} de ${MONTHS_ES_CHEF[d.getMonth()]}`
  }

  const dataRows = active.map((s) => `
    <tr>
      <td style="padding:9px 14px;font-size:13px;color:#18181B;border-bottom:1px solid #F4F4F5;">${fmtDate(s.fecha)}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.desayuno)}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.almuerzo)}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.cena)}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4E4E7;border-radius:8px;overflow:hidden;margin-top:16px;">
      <tr>
        <td colspan="4" style="background:#F4F4F5;padding:9px 16px;">
          <p style="margin:0;font-size:10px;font-weight:700;color:#71717A;text-transform:uppercase;letter-spacing:0.08em;">Días y comidas solicitadas</p>
        </td>
      </tr>
      <tr style="background:#FAFAFA;">
        <td style="padding:8px 14px;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #E4E4E7;">Día</td>
        <td style="padding:8px 14px;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;text-align:center;border-bottom:1px solid #E4E4E7;">Desayuno</td>
        <td style="padding:8px 14px;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;text-align:center;border-bottom:1px solid #E4E4E7;">Almuerzo</td>
        <td style="padding:8px 14px;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.06em;text-align:center;border-bottom:1px solid #E4E4E7;">Cena</td>
      </tr>
      ${dataRows}
    </table>`
}


type MatchingChef = {
  email: string
  first_name: string
}

type MealSlot = {
  fecha: string
  desayuno: boolean
  almuerzo: boolean
  cena: boolean
}

type WeeklyDetails = {
  comidas_por_semana: number | null
  raciones_por_comida: number | null
  frecuencia_cocina: string | null
  momentos: string | null
  preferencia_chef: string | null
  preferencias_culinarias: string | null
}

export type RequestData = {
  service_type: string
  occasion: string
  city: string | null
  event_date_start: string | null
  event_date_end: string | null
  event_time: string | null
  cuantas_personas: number | null
  cuisine_type: string | null
  budget_min: number | null
  budget_max: number | null
  descripcion_evento: string | null
  experiencia?: string | null
  restricciones?: string | null
  mealSlots?: MealSlot[]
  weeklyDetails?: WeeklyDetails
}

export async function notifyMatchingChefs(requestId: string, incomingReq?: RequestData): Promise<void> {
  if (!requestId || requestId === 'undefined') {
    console.error('[notify-chefs] requestId inválido recibido:', requestId)
    return
  }

  const admin = createAdminClient()

  // Siempre busca los datos frescos desde la DB — evita depender del caller
  const { data: requestRow, error: reqError } = await admin
    .from('service_requests')
    .select('user_id, service_type, occasion, city, country, event_date_start, event_date_end, event_time, guests_adults, guests_teens, guests_kids, cuisine_type, budget_min, budget_max, descripcion_evento')
    .eq('id', requestId)
    .single()

  if (reqError || !requestRow) {
    console.error('[notify-chefs] Could not fetch request data:', reqError)
    return
  }

  // Nombre del cliente para el copy del email — mismo patrón que notifyChefOfBookingConfirmed.
  const { data: clientUser } = await admin
    .from('users')
    .select('first_name, first_surname')
    .eq('id', requestRow.user_id)
    .maybeSingle()

  const clientName = clientUser
    ? ([clientUser.first_name, clientUser.first_surname].filter(Boolean).join(' ') || 'Un cliente')
    : 'Un cliente'

  let mealSlots: MealSlot[] = incomingReq?.mealSlots ?? []
  if (!mealSlots.length && requestRow.service_type === 'multiple') {
    const { data: dates, error: datesError } = await admin
      .from('request_dates')
      .select('fecha, desayuno, almuerzo, cena')
      .eq('request_id', requestId)
      .order('fecha')
    if (datesError) {
      console.warn('[notify-chefs] No se pudieron leer request_dates (¿falta GRANT a service_role?):', datesError.message)
    }
    mealSlots = (dates ?? []) as MealSlot[]
  }

  let weeklyDetails: WeeklyDetails | undefined
  if (requestRow.service_type === 'weekly') {
    const { data: wd, error: wdError } = await admin
      .from('weekly_meal_details')
      .select('comidas_por_semana, raciones_por_comida, frecuencia_cocina, momentos, preferencia_chef, preferencias_culinarias')
      .eq('request_id', requestId)
      .single()
    if (wdError) {
      console.warn('[notify-chefs] No se pudieron leer weekly_meal_details (¿falta GRANT a service_role?):', wdError.message)
    }
    if (wd) weeklyDetails = wd as WeeklyDetails
  }

  const totalGuests =
    (requestRow.guests_adults ?? 0) + (requestRow.guests_teens ?? 0) + (requestRow.guests_kids ?? 0)

  // Restricciones: satélite request_restrictions (misma fuente que el detalle
  // del client-dashboard). Query aparte para que un error de permisos no
  // tumbe la notificación completa — sin restricciones el email igual sale.
  const { data: restrRow, error: restrError } = await admin
    .from('request_restrictions')
    .select('vegetariano, vegano, sin_gluten, sin_lactosa, sin_mariscos, sin_frutos_secos, alergias_adicionales')
    .eq('request_id', requestId)
    .maybeSingle()
  if (restrError) {
    console.warn('[notify-chefs] No se pudieron leer restricciones:', restrError.message)
  }
  const restrictionLabels = restrRow
    ? ([
        restrRow.vegetariano      && 'Vegetariano',
        restrRow.vegano           && 'Vegano',
        restrRow.sin_gluten       && 'Sin gluten',
        restrRow.sin_lactosa      && 'Sin lactosa',
        restrRow.sin_mariscos     && 'Sin mariscos',
        restrRow.sin_frutos_secos && 'Sin frutos secos',
      ].filter(Boolean) as string[])
    : []
  if (restrRow?.alergias_adicionales) {
    restrictionLabels.push(`Alergias: ${restrRow.alergias_adicionales}`)
  }

  const tier =
    requestRow.budget_min != null && requestRow.budget_max != null
      ? tierFromBudget(requestRow.budget_min, requestRow.budget_max)
      : null
  const experiencia = tier ? TIER_DISPLAY[tier] : null

  const req: RequestData = {
    service_type:       requestRow.service_type,
    occasion:           requestRow.occasion,
    city:               requestRow.city,
    event_date_start:   requestRow.event_date_start,
    event_date_end:     requestRow.event_date_end,
    event_time:         requestRow.event_time,
    // Total de comensales: multiple desglosa en adultos/teens/niños; single y
    // weekly guardan todo en guests_adults (teens/kids quedan en 0).
    cuantas_personas:   totalGuests > 0 ? totalGuests : null,
    cuisine_type:       requestRow.cuisine_type,
    budget_min:         requestRow.budget_min,
    budget_max:         requestRow.budget_max,
    descripcion_evento: requestRow.descripcion_evento,
    experiencia,
    // Mismo fallback que el email del cliente ('No'); si la fila no se pudo
    // leer (GRANT pendiente) se omite la fila en vez de afirmar "No".
    restricciones:      restrRow ? (restrictionLabels.join(', ') || 'No') : null,
    mealSlots,
    weeklyDetails,
  }

  const { data: rows, error: chefsError } = await admin
    .from('chef_profiles')
    .select(`
      city,
      country,
      additional_cities,
      users!inner ( email, first_name ),
      request_settings!inner (
        accepts_single, accepts_multiple, accepts_weekly,
        min_guests, max_guests, min_budget, advance_days
      )
    `)
    .eq('is_active', true)

  if (chefsError) {
    console.error('[notify-chefs] Error fetching chefs:', chefsError)
    return
  }

  const vType      = req.service_type
  const vGuests    = req.cuantas_personas
  const vBudgetMax = req.budget_max
  const vDate      = req.event_date_start

  // Geografía del request, normalizada una sola vez (misma convención que el catálogo).
  const reqCountryKey = normalizeCity(requestRow.country)
  const reqCityKey    = normalizeCity(req.city)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chefs: MatchingChef[] = ((rows ?? []) as any[])
    .filter((cp) => {
      const rs = Array.isArray(cp.request_settings) ? cp.request_settings[0] : cp.request_settings
      if (!rs) return false

      // ── Geografía: país primero (innegociable), luego ciudad ∈ cobertura ──
      const chefCountryKey = normalizeCity(cp.country)
      if (!reqCountryKey || !chefCountryKey || reqCountryKey !== chefCountryKey) return false

      // Cobertura del chef: ciudad base + adicionales (estas ya vienen normalizadas en DB).
      const covered = new Set<string>()
      const baseCity = normalizeCity(cp.city)
      if (baseCity) covered.add(baseCity)
      for (const k of (cp.additional_cities ?? []) as string[]) {
        const nk = normalizeCity(k)
        if (nk) covered.add(nk)
      }
      if (!reqCityKey || !covered.has(reqCityKey)) return false

      if (vType === 'single'   && !rs.accepts_single)          return false
      if (vType === 'multiple' && !rs.accepts_multiple)        return false
      if (vType === 'weekly'   && rs.accepts_weekly === false) return false

      // Para weekly, guests_adults es raciones_por_comida — no comparable al rango de
      // comensales de un evento. Se omite el filtro para no descartar chefs incorrectamente.
      if (vType !== 'weekly' && vGuests != null) {
        if (vGuests < (rs.min_guests ?? 1) || vGuests > (rs.max_guests ?? 9999)) return false
      }

      if (rs.min_budget != null && vBudgetMax != null && vBudgetMax < rs.min_budget) return false

      const adv = rs.advance_days ?? 0
      if (adv > 0 && vDate) {
        const minDate = new Date()
        minDate.setDate(minDate.getDate() + adv)
        if (vDate < minDate.toISOString().split('T')[0]) return false
      }

      return true
    })
    .map((cp) => {
      const u = Array.isArray(cp.users) ? cp.users[0] : cp.users
      return { email: u.email as string, first_name: u.first_name as string }
    })

  if (chefs.length === 0) {
    console.log('[notify-chefs] No matching chefs for request', requestId)
    return
  }

  if (!resend) {
    console.warn('[notify-chefs] RESEND_API_KEY not configured, skipping email notifications')
    return
  }

  const client = resend

  const results = await Promise.allSettled(
    (chefs as MatchingChef[]).map((chef) => {
      return client.emails.send({
        from:    FROM_EMAIL,
        to:      resolveRecipient(chef.email),
        replyTo: REPLY_TO,
        subject: `${testSubjectPrefix(chef.email)}${clientName} busca un chef en ${req.city ?? 'tu ciudad'} — GetChef`,
        html: buildEmailHtml(chef.first_name, req, clientName),
      })
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`[notify-chefs] ${failed}/${results.length} emails failed for request ${requestId}`)
  } else {
    console.log(`[notify-chefs] ${results.length} emails sent for request ${requestId}`)
  }
}

// ── Email: reserva confirmada (el cliente pagó la propuesta) ────────────────
function buildBookingConfirmedEmail(opts: {
  chefName:    string
  clientName:  string
  eventDate:   string | null
  eventTime:   string | null
  city:        string | null
  totalAmount: number
  currency:    string
}): string {
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })

  return shell(`
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
      Hola <strong>${opts.chefName}</strong>, ¡tenés una reserva confirmada!
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3F3F46;">
      <strong>${opts.clientName}</strong> confirmó el pago de tu propuesta. El servicio ya está agendado.
    </p>
    ${section('Detalle del servicio', [
      ['Cliente', opts.clientName],
      ['Ciudad',  opts.city ?? undefined],
      ['Hora',    opts.eventTime ?? undefined],
      ['Fecha',   opts.eventDate ? fmtDate(opts.eventDate) : undefined],
      ['Monto',   `${opts.totalAmount} ${opts.currency}`],
    ])}
    ${ctaBand({
      title: `¡Reserva confirmada con ${opts.clientName}!`,
      subtitle: 'El servicio ya está agendado — revisá los detalles.',
      buttonLabel: 'Ver mi reserva',
      href: `${SITE_URL}/dashboard/requests`,
    })}
  `, 'Reserva confirmada')
}

/**
 * Notifica al chef que su propuesta fue pagada. La llaman dlocalgo-verify.ts y
 * paypal-verify.ts, ambos justo después de que create_booking_for_payment()
 * confirma el booking — es el único choke point común a los dos proveedores.
 *
 * Idempotente vía claim atómico sobre bookings.chef_notified_at: el webhook de
 * pago puede reintentar (o correr en paralelo con el retorno síncrono del
 * cliente), y solo quien "gana" el UPDATE manda el email.
 */
export async function notifyChefOfBookingConfirmed(bookingId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: booking, error: claimError } = await admin
    .from('bookings')
    .update({ chef_notified_at: new Date().toISOString() })
    .eq('id', bookingId)
    .is('chef_notified_at', null)
    .select('chef_id, request_id, total_amount, currency')
    .maybeSingle()

  if (claimError) {
    console.error('[notifyChefOfBookingConfirmed] claim failed:', claimError)
    return
  }
  if (!booking) return // ya notificado (otra carrera lo ganó)

  const [chefResult, requestResult] = await Promise.all([
    admin
      .from('chef_profiles')
      .select('users!inner(email, first_name)')
      .eq('id', booking.chef_id)
      .single(),
    admin
      .from('service_requests')
      .select('event_date_start, event_time, city, user_id')
      .eq('id', booking.request_id)
      .single(),
  ])

  if (chefResult.error || !chefResult.data) {
    console.error('[notifyChefOfBookingConfirmed] chef fetch failed:', chefResult.error)
    return
  }
  if (requestResult.error || !requestResult.data) {
    console.error('[notifyChefOfBookingConfirmed] request fetch failed:', requestResult.error)
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chefUsers = (chefResult.data as any).users
  const chefUser  = Array.isArray(chefUsers) ? chefUsers[0] : chefUsers
  const req       = requestResult.data

  const { data: clientUser } = await admin
    .from('users')
    .select('first_name, first_surname')
    .eq('id', req.user_id)
    .maybeSingle()

  const clientName = clientUser
    ? ([clientUser.first_name, clientUser.first_surname].filter(Boolean).join(' ') || 'Cliente')
    : 'Cliente'

  if (!resend) {
    console.warn('[notifyChefOfBookingConfirmed] RESEND_API_KEY no configurado, omitiendo email')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(chefUser.email),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(chefUser.email)}¡Tenés una reserva confirmada! — GetChef`,
    html: buildBookingConfirmedEmail({
      chefName:    chefUser.first_name,
      clientName,
      eventDate:   req.event_date_start,
      eventTime:   req.event_time,
      city:        req.city,
      totalAmount: booking.total_amount,
      currency:    booking.currency,
    }),
  })

  if (error) console.error('[notifyChefOfBookingConfirmed] send failed:', error)
}
