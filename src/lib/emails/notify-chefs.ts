'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { resend } from '@/lib/resend'

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

const CUISINE_LABELS: Record<string, string> = {
  local:          'Local',
  mediterranean:  'Mediterránea',
  french:         'Francesa',
  fusion:         'Fusión',
  italian:        'Italiana',
  seafood:        'Mariscos',
  japanese:       'Japonesa',
  chefs_special:  'Sorpresa del Chef',
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
            <p style="margin:0;font-size:22px;font-weight:700;color:#E09F3E;letter-spacing:-0.5px;">GetChef</p>
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
    <a href="${href}" style="display:inline-block;background:#E09F3E;color:#18181B;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">${label}</a>
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

function buildEmailHtml(chef: string, req: RequestData): string {
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
  const dateFormatted = req.event_date_start
    ? req.event_date_end && req.event_date_end !== req.event_date_start
      ? `${fmtDate(req.event_date_start)} → ${fmtDate(req.event_date_end)}`
      : fmtDate(req.event_date_start)
    : undefined
  const mealTimeLabel = req.event_time === 'Cena'
    ? '🌙 Cena'
    : req.event_time === 'Comida'
      ? '☀️ Comida'
      : req.event_time ?? undefined
  const budget = req.budget_min && req.budget_max
    ? `$${req.budget_min.toLocaleString('es-UY')} – $${req.budget_max.toLocaleString('es-UY')}`
    : undefined

  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return shell(`
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
      Hola <strong>${chef}</strong>, hay una nueva solicitud en tu ciudad que coincide con tu perfil.
    </p>
    <div style="margin-top:8px;">
      ${section('Dónde y cuándo', [
        ['Ciudad', req.city ?? undefined],
        ['Fecha',  dateFormatted],
      ])}
      ${req.mealSlots?.length ? mealSlotsTableChef(req.mealSlots) : ''}
      ${section('Solicitud', [
        ['Tipo de servicio',   SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type],
        ['Ocasión',            OCCASION_LABELS[req.occasion] ?? req.occasion],
        ['Horario',            mealTimeLabel],
        ['Comensales',         req.cuantas_personas != null ? String(req.cuantas_personas) : undefined],
        ['Tipo de cocina',     req.cuisine_type ? (CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type) : undefined],
        ['Presupuesto',        budget],
      ])}
      ${section('Descripción', [
        ['Notas', req.descripcion_evento ?? undefined],
      ])}
    </div>
    ${cta(`${SITE_URL}/dashboard/requests`, 'Ver solicitud en el dashboard')}
  `)
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
  mealSlots?: MealSlot[]
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
    .select('service_type, occasion, city, event_date_start, event_date_end, event_time, guests_adults, cuisine_type, budget_min, budget_max, descripcion_evento')
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

  const req: RequestData = {
    service_type:       requestRow.service_type,
    occasion:           requestRow.occasion,
    city:               requestRow.city,
    event_date_start:   requestRow.event_date_start,
    event_date_end:     requestRow.event_date_end,
    event_time:         requestRow.event_time,
    cuantas_personas:   requestRow.guests_adults,
    cuisine_type:       requestRow.cuisine_type,
    budget_min:         requestRow.budget_min,
    budget_max:         requestRow.budget_max,
    descripcion_evento: requestRow.descripcion_evento,
    mealSlots,
  }

  const { data: rows, error: chefsError } = await admin
    .from('chef_profiles')
    .select(`
      city,
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

  const vCity      = req.city
  const vType      = req.service_type
  const vGuests    = req.cuantas_personas
  const vBudgetMax = req.budget_max
  const vDate      = req.event_date_start

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chefs: MatchingChef[] = ((rows ?? []) as any[])
    .filter((cp) => {
      const rs = Array.isArray(cp.request_settings) ? cp.request_settings[0] : cp.request_settings
      if (!rs) return false

      if (cp.city && vCity &&
          cp.city.toLowerCase().trim() !== vCity.toLowerCase().trim()) return false

      if (vType === 'single'   && !rs.accepts_single)   return false
      if (vType === 'multiple' && !rs.accepts_multiple) return false
      if (vType === 'weekly'   && !rs.accepts_weekly)   return false

      if (vGuests != null) {
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
