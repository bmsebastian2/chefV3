'use server'

import { resend } from '@/lib/resend'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const HAS_DOMAIN = !!process.env.RESEND_FROM_EMAIL
const FROM = HAS_DOMAIN
  ? `GetChef <${process.env.RESEND_FROM_EMAIL}>`
  : 'GetChef <onboarding@resend.dev>'

function to(email: string): string {
  const dev = process.env.RESEND_DEV_EMAIL
  return HAS_DOMAIN ? email : (dev ?? email)
}

function pfx(email: string): string {
  return HAS_DOMAIN ? '' : `[TEST → ${email}] `
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
}

// ── HTML shell ────────────────────────────────────────────────────────────────
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
            <p style="margin:6px 0 0;font-size:13px;color:#A1A1AA;">Tu plataforma de chefs privados</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #F4F4F5;">
            <p style="margin:0;font-size:12px;color:#A1A1AA;text-align:center;">
              Recibiste este email porque realizaste una solicitud en GetChef.
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

function detailsBlock(r: RequestSummary): string {
  return `<div style="margin-top:24px;">
    ${section('Dónde y cuándo', [
      ['Lugar', r.lugar],
      ['Hora', r.hora],
      ['Fecha', r.fecha],
    ])}
    ${section('Presupuesto', [
      ['Número de comensales', r.comensales],
      ['Precio por persona', r.precio],
      ['Tipo de experiencia', r.experiencia],
    ])}
    ${section('Evento', [
      ['Preferencias gastronómicas', r.gastronomia],
      ['Restricciones alimentarias', r.restricciones],
      ['Ocasión', r.ocasion],
    ])}
    ${section('Algo que añadir', [
      ['Notas', r.notas],
    ])}
  </div>`
}

// ── Case A: existing user — solicitud activa ───────────────────────────────
function buildActiveEmail(name: string, summary?: RequestSummary): string {
  return shell(`
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Hola <strong>${name}</strong>, tu solicitud ha sido recibida.
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3F3F46;">
      En menos de <strong>30 minutos</strong> recibirás propuestas de menú personalizadas
      de nuestra red de chefs. Puedes seguir el estado desde tu dashboard.
    </p>
    ${summary ? detailsBlock(summary) : ''}
    ${cta(`${SITE_URL}/client-dashboard`, 'Ver mi solicitud')}
  `)
}

// ── Case B: magic link — confirma + inicia sesión + redirige al dashboard ─────
function buildMagicLinkEmail(name: string, magicLink: string, tempPassword?: string, summary?: RequestSummary): string {
  const credBlock = tempPassword
    ? `<div style="background:#F4F4F5;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0 0 6px;font-size:11px;color:#71717A;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Acceso alternativo con contraseña</p>
        <p style="margin:0 0 4px;font-size:13px;color:#3F3F46;">Si el enlace expiró, podés iniciar sesión en <a href="${SITE_URL}/login" style="color:#E09F3E;">${SITE_URL}/login</a> con:</p>
        <p style="margin:6px 0 0;font-size:14px;">
          <span style="color:#71717A;">Contraseña temporal:</span>
          <strong style="font-family:monospace;font-size:15px;margin-left:8px;">${tempPassword}</strong>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#A1A1AA;">Te recomendamos cambiarla desde tu perfil.</p>
      </div>`
    : ''

  return shell(`
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      Hola <strong>${name}</strong>, bienvenido a GetChef.
    </p>
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
    ${cta(magicLink, 'Ingresar y ver mi solicitud')}
    <p style="margin-top:20px;font-size:12px;color:#A1A1AA;">
      Si el botón no funciona, copia y pega este enlace:<br>
      <span style="color:#6366F1;word-break:break-all;">${magicLink}</span>
    </p>
    ${credBlock}
  `)
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

  const recipient = to(opts.email)
  const prefix    = pfx(opts.email)

  if (!opts.isNewUser) {
    // Caso A: 1 email
    await resend.emails
      .send({
        from:    FROM,
        to:      recipient,
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
    from:    FROM,
    to:      recipient,
    subject: `${prefix}Tu solicitud en GetChef — ingresá con un click`,
    html:    buildMagicLinkEmail(opts.name, opts.confirmationLink, opts.tempPassword, opts.requestSummary),
  })
  if (error) console.error('[client-emails] Caso B falló:', error)
}
