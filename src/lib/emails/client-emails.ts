'use server'

import { resend, FROM_EMAIL, REPLY_TO, resolveRecipient, testSubjectPrefix } from '@/lib/resend'
import { emailFooter, ctaBand, detailBlock, tierBadge, heroGrid, tierBadgeLabel, greetingBlock, EMAIL_RESPONSIVE_STYLES, SITE_URL } from './shared'

export interface MealSlotSummary {
  fecha: string   // 'YYYY-MM-DD'
  desayuno: boolean
  almuerzo: boolean
  cena: boolean
}

export interface RequestSummary {
  lugar?: string
  hora?: string
  fecha?: string
  comensales?: string
  precio?: string
  experiencia?: string
  gastronomia?: string
  restricciones?: string
  ocasion?: string
  notas?: string
  mealSlots?: MealSlotSummary[]
  // Detalle del servicio semanal (strings ya formateados en ES desde actions.ts)
  semanal?: {
    frecuencia?: string   // "2 días por semana"
    dias?: string         // "lunes y jueves"
    momentos?: string     // "Almuerzo y cena"
    personas?: string     // "4 personas"
    total?: string        // "4 comidas semanales"
  }
}

// Perforado "sello postal" arriba y abajo del card — círculos recortados a
// la mitad con overflow:hidden, sin depender de ninguna imagen ni gradiente
// (mismo truco que notify-chefs.ts).
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

const SCALLOP_TOP_ROW    = scallopRow(true, '#FAFAFA')
const SCALLOP_BOTTOM_ROW = scallopRow(false, '#FAFAFA')

// Dorado — acento premium para labels, chip y detalles finos. No reemplaza
// el verde de marca (CTA, checks): conviven, el dorado es solo ornamento.
const GOLD = '#B8935B'

// ── HTML shell ────────────────────────────────────────────────────────────────
function shell(body: string): string {
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
                <p style="margin:0;font-size:13px;color:${GOLD};">✨ Experiencias gastronómicas a medida</p>
              </td>
              <td width="200" style="padding:0;line-height:0;font-size:0;">
                <img src="${SITE_URL}/banner-chef.webp" width="200" height="140" style="display:block;width:200px;height:140px;object-fit:cover;" alt="">
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        ${emailFooter('client')}
        ${SCALLOP_BOTTOM_ROW}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}


function trustBlock(): string {
  const items = [
    'Chefs verificados y evaluados',
    'Propuestas de menú a medida',
    'Pago protegido hasta el día del servicio',
  ]
  return `<div style="background:#F0FDF4;border:1px solid #DCFCE7;border-radius:8px;padding:14px 20px;margin:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${items.map((item) => `
      <tr><td style="padding:4px 0;font-size:13px;color:#166534;">
        <span style="color:#16A34A;font-weight:700;margin-right:8px;">✓</span>${item}
      </td></tr>`).join('')}
    </table>
  </div>`
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

const DAYS_ES    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS_ES_EMAIL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function mealSlotsTable(slots: MealSlotSummary[]): string {
  const active = slots.filter((s) => s.desayuno || s.almuerzo || s.cena)
  if (!active.length) return ''

  const check = (v: boolean) =>
    v ? `<span style="color:#16A34A;font-weight:700;font-size:15px;">✓</span>`
      : `<span style="color:#D4D4D8;">—</span>`

  const fmtDate = (fecha: string) => {
    const d   = new Date(fecha + 'T00:00:00')
    const day = DAYS_ES[d.getDay()]
    return `${day} ${d.getDate()} de ${MONTHS_ES_EMAIL[d.getMonth()]}`
  }

  const dataRows = active.map((s) => `
      <tr>
        <td style="padding:9px 14px;font-size:13px;color:#18181B;border-bottom:1px solid #F4F4F5;">${fmtDate(s.fecha)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.desayuno)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.almuerzo)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center;border-bottom:1px solid #F4F4F5;">${check(s.cena)}</td>
      </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #E4E4E7;border-radius:8px;overflow:hidden;">
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

function detailsBlock(r: RequestSummary): string {
  const badgeLabel = r.semanal ? 'Servicio Semanal' : (r.experiencia ? tierBadgeLabel(r.experiencia) : 'Solicitud')

  const hero: [string, string, string][] = r.semanal
    ? [
        ['date', 'Fecha',      r.fecha ?? '—'],
        ['🔁', 'Frecuencia', r.semanal.frecuencia ?? '—'],
        ['location', 'Lugar',      r.lugar ?? '—'],
        ['user', 'Personas',   r.semanal.personas ?? '—'],
      ]
    : [
        ['date', 'Fecha',      r.fecha ?? '—'],
        ['user', 'Comensales', r.comensales ?? '—'],
        ['location', 'Lugar',      r.lugar ?? '—'],
        ['tag', 'Precio',     r.precio ?? '—'],
      ]

  const rows: [string, string, string | undefined][] = r.semanal
    ? [
        ['📅', 'Días',                       r.semanal.dias],
        ['🕐', 'Momentos por día',           r.semanal.momentos],
        ['🍽️', 'Total de comidas',           r.semanal.total],
        ['hoja', 'Restricciones alimentarias', r.restricciones],
        ['nota', 'Notas',                      r.notas],
      ]
    : [
        ['reloj', 'Hora',                       r.hora],
        ['cubiertos', 'Preferencias gastronómicas', r.gastronomia],
        ['hoja', 'Restricciones alimentarias', r.restricciones],
        ['party', 'Ocasión',                    r.ocasion ? (OCCASION_LABELS[r.ocasion] ?? r.ocasion) : undefined],
        ['nota', 'Notas',                      r.notas],
      ]

  return `<div style="margin-top:24px;">
    ${tierBadge(badgeLabel)}
    ${heroGrid(hero)}
    ${detailBlock(rows)}
    ${r.mealSlots?.length ? mealSlotsTable(r.mealSlots) : ''}
  </div>`
}

// ── Case A: existing user — solicitud activa ───────────────────────────────
function buildActiveEmail(name: string, summary?: RequestSummary): string {
  return shell(`
    ${greetingBlock({
      name,
      headline: 'Tu solicitud fue recibida con éxito.',
      showSeal: summary?.experiencia === 'Exclusivo',
    })}
    ${trustBlock()}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3F3F46;">
      En menos de <strong>30 minutos</strong> empiezan a llegar las propuestas de menú
      diseñadas para tu evento. Puedes seguir el estado desde tu dashboard.
    </p>
    ${summary ? detailsBlock(summary) : ''}
    ${ctaBand({
      title: 'Seguí el estado de tu solicitud',
      subtitle: 'Revisá las propuestas a medida que vayan llegando.',
      buttonLabel: 'Ver mi solicitud',
      href: `${SITE_URL}/client-dashboard`,
    })}
  `)
}

// ── Case B: magic link — confirma + inicia sesión + redirige al dashboard ─────
function buildMagicLinkEmail(name: string, magicLink: string, tempPassword?: string, summary?: RequestSummary): string {
  const credBlock = tempPassword
    ? `<div style="background:#F4F4F5;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0 0 6px;font-size:11px;color:#71717A;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Acceso alternativo con contraseña</p>
        <p style="margin:0 0 4px;font-size:13px;color:#3F3F46;">Si el enlace expiró, podés iniciar sesión en <a href="${SITE_URL}/?login=true" style="color:#22c55e;">${SITE_URL}</a> con:</p>
        <p style="margin:6px 0 0;font-size:14px;">
          <span style="color:#71717A;">Contraseña temporal:</span>
          <strong style="font-family:monospace;font-size:15px;margin-left:8px;">${tempPassword}</strong>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#A1A1AA;">Te recomendamos cambiarla desde tu perfil.</p>
      </div>`
    : ''

  return shell(`
    ${greetingBlock({
      name,
      headline: 'Bienvenido a GetChef.',
      showSeal: summary?.experiencia === 'Exclusivo',
    })}
    ${trustBlock()}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3F3F46;">
      Tu solicitud está lista. Hacé click en el botón para ingresar a tu dashboard
      y ver cómo avanza — sin contraseña, en un solo click.
    </p>
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#92400E;">
        ⚠️ Este enlace es válido por <strong>24 horas</strong> y de un solo uso.
      </p>
    </div>
    ${summary ? detailsBlock(summary) : ''}
    ${ctaBand({
      title: 'Tu solicitud está lista',
      subtitle: 'Ingresá con un click, sin necesidad de contraseña.',
      buttonLabel: 'Ingresar y ver mi solicitud',
      href: magicLink,
    })}
    <p style="margin-top:20px;font-size:12px;color:#A1A1AA;">
      Si el botón no funciona, copia y pega este enlace:<br>
      <span style="color:#6366F1;word-break:break-all;">${magicLink}</span>
    </p>
    ${credBlock}
  `)
}


// ── Email: nueva propuesta del chef ──────────────────────────────────────────
const MONTHS_ES_PROPOSAL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function buildProposalEmail(opts: {
  clientName: string
  chefName: string
  mealTime: string | null
  eventDate: string | null
  requestId: string
}): string {
  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return `${date.getDate()} de ${MONTHS_ES_PROPOSAL[date.getMonth()]} de ${date.getFullYear()}`
  }

  const dateStr = opts.eventDate ? fmtDate(opts.eventDate) : null
  const mealStr = opts.mealTime ? opts.mealTime.toLowerCase() : null

  const serviceInfo = mealStr && dateStr
    ? `para la <strong>${mealStr}</strong> el día <strong>${dateStr}</strong>`
    : dateStr
      ? `para el día <strong>${dateStr}</strong>`
      : 'para tu solicitud de servicio'

  return shell(`
    ${greetingBlock({
      name: opts.clientName,
      headline: `El chef ${opts.chefName} te envió una propuesta ${serviceInfo}.`,
    })}
    ${ctaBand({
      title: `${opts.chefName} te envió una propuesta`,
      subtitle: 'Revisala antes de que se agote tu fecha.',
      buttonLabel: 'Ver propuesta',
      href: `${SITE_URL}/client-dashboard/${opts.requestId}/proposals`,
    })}
  `)
}

export async function sendProposalEmail(opts: {
  clientEmail: string
  clientName: string
  chefName: string
  mealTime: string | null
  eventDate: string | null
  requestId: string
}): Promise<void> {
  if (!resend) {
    console.warn('[client-emails] RESEND_API_KEY no configurado, omitiendo email de propuesta')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(opts.clientEmail),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(opts.clientEmail)}${opts.chefName} te envió una propuesta — GetChef`,
    html:    buildProposalEmail(opts),
  })

  if (error) console.error('[client-emails] sendProposalEmail falló:', error)
}

// ── Email: reserva cancelada (cancelación admin, ej. chef bloqueado) ────────────
function buildBookingCancelledEmail(opts: {
  clientName:   string
  eventDate:    string | null
  refundAmount: number
  currency:     string
}): string {
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })

  return shell(`
    ${greetingBlock({
      name: opts.clientName,
      headline: 'Tu reserva fue cancelada.',
      detailLine: `Tu chef ya no puede realizar el servicio${opts.eventDate ? ` programado para el ${fmtDate(opts.eventDate)}` : ''}. Tu pago de ${opts.refundAmount} ${opts.currency} ya está en proceso de reembolso.`,
    })}
    ${ctaBand({
      title: 'Tu reembolso está en camino',
      subtitle: 'Revisá el estado de tu cuenta cuando quieras.',
      buttonLabel: 'Ver mi cuenta',
      href: `${SITE_URL}/client-dashboard`,
    })}
  `)
}

export async function sendBookingCancelledEmail(opts: {
  clientEmail:  string
  clientName:   string
  eventDate:    string | null
  refundAmount: number
  currency:     string
}): Promise<void> {
  if (!resend) {
    console.warn('[client-emails] RESEND_API_KEY no configurado, omitiendo email de cancelación')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(opts.clientEmail),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(opts.clientEmail)}Tu reserva fue cancelada — reembolso en proceso — GetChef`,
    html:    buildBookingCancelledEmail(opts),
  })

  if (error) console.error('[client-emails] sendBookingCancelledEmail falló:', error)
}

// ── Punto de entrada ──────────────────────────────────────────────────────────
export async function sendClientEmails(opts: {
  email: string
  name: string
  isNewUser: boolean
  tempPassword?: string
  confirmationLink?: string
  requestSummary?: RequestSummary
}): Promise<void> {
  if (!resend) {
    console.warn('[client-emails] RESEND_API_KEY no configurado, omitiendo emails')
    return
  }

  const recipient = resolveRecipient(opts.email)
  const prefix    = testSubjectPrefix(opts.email)

  if (!opts.isNewUser) {
    // Caso A: 1 email
    await resend.emails
      .send({
        from:    FROM_EMAIL,
        to:      recipient,
        replyTo: REPLY_TO,
        subject: `${prefix}Tu solicitud ha sido recibida — GetChef`,
        html:    buildActiveEmail(opts.name, opts.requestSummary),
      })
      .catch((err) => console.error('[client-emails] Caso A falló:', err))
    return
  }

  // Caso B: 1 email con magic link
  if (!opts.confirmationLink) {
    console.warn('[client-emails] Caso B sin magic link, omitiendo email de nuevo usuario')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      recipient,
    replyTo: REPLY_TO,
    subject: `${prefix}Tu solicitud en GetChef — ingresá con un click`,
    html:    buildMagicLinkEmail(opts.name, opts.confirmationLink, opts.tempPassword, opts.requestSummary),
  })
  if (error) console.error('[client-emails] Caso B falló:', error)
}
