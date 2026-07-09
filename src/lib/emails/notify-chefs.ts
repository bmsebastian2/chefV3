'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { resend } from '@/lib/resend'
import { normalizeCity } from '@/lib/maps/normalizeCity'

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

// Mapa inverso del BUDGET_MAP del wizard: el tier no se persiste como columna,
// se reconoce por el rango exacto de budget_min/budget_max.
const EXPERIENCE_BY_BUDGET: Record<string, string> = {
  '210-263': 'Casual',
  '263-315': 'Gourmet',
  '315-420': 'Exclusivo',
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

// ── HTML shell (idéntico al de client-emails) ─────────────────────────────────
function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:'Helvetica Neue',Arial,sans-serif;color:#18181B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#18181B;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#22c55e;letter-spacing:-0.5px;">GetChef</p>
            <p style="margin:6px 0 0;font-size:13px;color:#A1A1AA;">Nueva solicitud de servicio</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #F4F4F5;">
            <p style="margin:0;font-size:12px;color:#A1A1AA;text-align:center;">
              Recibiste este email porque tu perfil está activo en GetChef.<br>
              Podés ajustar tus preferencias de solicitud desde tu dashboard.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function cta(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
  <tr><td align="center">
    <a href="${href}" style="display:inline-block;background:#22c55e;color:#18181B;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">${label}</a>
  </td></tr>
</table>`
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

const DAY_NAMES_CHEF: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

function buildEmailHtml(chef: string, req: RequestData): string {
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })

  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const intro = `
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
      Hola <strong>${chef}</strong>, hay una nueva solicitud en tu ciudad que coincide con tu perfil.
    </p>`
  const ctaBlock = cta(`${SITE_URL}/dashboard/requests`, 'Ver solicitud en el dashboard')

  if (req.service_type === 'weekly') {
    const wd = req.weeklyDetails
    const frecuenciaLabel = wd?.frecuencia_cocina
      ? wd.frecuencia_cocina
          .split(',')
          .map((n) => DAY_NAMES_CHEF[Number(n.trim())] ?? n.trim())
          .filter(Boolean)
          .join(', ')
      : undefined

    return shell(`${intro}
    <div style="margin-top:8px;">
      ${section('Dónde y cuándo', [
        ['Ciudad',          req.city ?? undefined],
        ['Fecha de inicio', req.event_date_start ? fmtDate(req.event_date_start) : undefined],
      ])}
      ${section('Servicio semanal', [
        ['Tipo de servicio',      SERVICE_TYPE_LABELS['weekly']],
        ['Comidas por semana',    wd?.comidas_por_semana != null ? String(wd.comidas_por_semana) : undefined],
        ['Raciones por comida',   wd?.raciones_por_comida != null ? String(wd.raciones_por_comida) : undefined],
        ['Días preferidos',       frecuenciaLabel],
        ['Preferencia de chef',   wd?.preferencia_chef ?? undefined],
        ['Preferencias culinarias', wd?.preferencias_culinarias ?? undefined],
        ['Restricciones alimentarias', req.restricciones ?? undefined],
      ])}
      ${section('Descripción', [
        ['Notas', req.descripcion_evento ?? undefined],
      ])}
    </div>
    ${ctaBlock}`)
  }

  // single / multiple — misma estructura y labels que el detailsBlock del
  // email del cliente (client-emails.ts), con la ciudad en lugar de la
  // dirección completa (no se expone el lugar exacto antes de reservar).
  const comensales = req.cuantas_personas != null
    ? `${req.cuantas_personas} ${req.cuantas_personas === 1 ? 'persona' : 'personas'}`
    : undefined
  const precio = req.budget_min && req.budget_max
    ? `desde $${req.budget_min} a $${req.budget_max} USD`
    : undefined

  return shell(`${intro}
    <div style="margin-top:8px;">
      ${section('Dónde y cuándo', [
        ['Ciudad', req.city ?? undefined],
        ['Hora',   req.event_time ?? undefined],
        ['Fecha',  req.event_date_start ? fmtDate(req.event_date_start) : undefined],
      ])}
      ${req.mealSlots?.length ? mealSlotsTableChef(req.mealSlots) : ''}
      ${section('Presupuesto', [
        ['Número de comensales', comensales],
        ['Precio por persona',   precio],
        ['Tipo de experiencia',  req.experiencia ?? undefined],
      ])}
      ${section('Evento', [
        ['Preferencias gastronómicas', req.cuisine_type ? (CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type) : undefined],
        ['Restricciones alimentarias', req.restricciones ?? undefined],
        ['Ocasión',                    OCCASION_LABELS[req.occasion] ?? req.occasion],
        ['Tipo de servicio',           SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type],
      ])}
      ${section('Algo que añadir', [
        ['Notas', req.descripcion_evento ?? undefined],
      ])}
    </div>
    ${ctaBlock}`)
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
    .select('service_type, occasion, city, country, event_date_start, event_date_end, event_time, guests_adults, guests_teens, guests_kids, cuisine_type, budget_min, budget_max, descripcion_evento')
    .eq('id', requestId)
    .single()

  if (reqError || !requestRow) {
    console.error('[notify-chefs] Could not fetch request data:', reqError)
    return
  }

  let mealSlots: MealSlot[] = incomingReq?.mealSlots ?? []
  if (!mealSlots.length && requestRow.service_type === 'multiple') {
    const { data: dates } = await admin
      .from('request_dates')
      .select('fecha, desayuno, almuerzo, cena')
      .eq('request_id', requestId)
      .order('fecha')
    mealSlots = (dates ?? []) as MealSlot[]
  }

  let weeklyDetails: WeeklyDetails | undefined
  if (requestRow.service_type === 'weekly') {
    const { data: wd } = await admin
      .from('weekly_meal_details')
      .select('comidas_por_semana, raciones_por_comida, frecuencia_cocina, preferencia_chef, preferencias_culinarias')
      .eq('request_id', requestId)
      .single()
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

  const experiencia =
    requestRow.budget_min != null && requestRow.budget_max != null
      ? EXPERIENCE_BY_BUDGET[`${requestRow.budget_min}-${requestRow.budget_max}`] ?? null
      : null

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
  const devEmail = process.env.RESEND_DEV_EMAIL
  const hasVerifiedDomain = !!process.env.RESEND_FROM_EMAIL
  const fromAddress = hasVerifiedDomain
    ? `GetChef <${process.env.RESEND_FROM_EMAIL}>`
    : 'GetChef <onboarding@resend.dev>'

  const results = await Promise.allSettled(
    (chefs as MatchingChef[]).map((chef) => {
      const to = hasVerifiedDomain ? chef.email : (devEmail ?? chef.email)
      return client.emails.send({
        from:    fromAddress,
        to,
        subject: hasVerifiedDomain
          ? `Nueva solicitud en tu ciudad — ${req.city ?? 'sin ciudad'}`
          : `[TEST → ${chef.email}] Nueva solicitud en tu ciudad — ${req.city ?? 'sin ciudad'}`,
        html: buildEmailHtml(chef.first_name, req),
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
