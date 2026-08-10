'use server'

import { resend, FROM_EMAIL, REPLY_TO, resolveRecipient, testSubjectPrefix } from '@/lib/resend'
import { emailFooter, ctaBand, greetingBlock, iconUrl, EMAIL_RESPONSIVE_STYLES, ASSET_BASE_URL } from './shared'

// Perforado "sello postal" arriba y abajo del card — mismo truco que
// client-emails.ts / notify-chefs.ts.
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

const CARD_BG = '#FBF8F1'
const GOLD = '#B8935B'

const SCALLOP_TOP_ROW    = scallopRow(true, '#FAFAFA')
const SCALLOP_BOTTOM_ROW = scallopRow(false, '#FAFAFA')

// ── HTML shell (idéntico al de client-emails / notify-chefs) ─────────────────
function shell(body: string, subtitle: string = 'Bienvenido al equipo'): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${EMAIL_RESPONSIVE_STYLES}</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:'Helvetica Neue',Arial,sans-serif;color:#18181B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:${CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(24,24,27,0.12);">
        ${SCALLOP_TOP_ROW}
        <tr>
          <td style="background:#18181B;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>
              <td width="360" height="170" style="width:360px;height:170px;padding:24px 16px 28px 32px;text-align:center;" valign="middle">
                <img src="${iconUrl('chef-hat')}" width="34" height="34" style="display:block;margin:0 auto 8px;" alt="">
                <p style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                  <span style="color:#22c55e;">Get</span><span style="color:#ffffff;">Chef</span>
                </p>
                <div style="height:1px;font-size:0;line-height:1px;margin:0 0 12px;background:rgba(184,147,91,0.4);">&nbsp;</div>
                <p style="margin:0;font-size:13px;color:${GOLD};">✦ ${subtitle}</p>
              </td>
              <td width="200" height="170" bgcolor="#18181B" background="${ASSET_BASE_URL}/banner-chef.webp" style="width:200px;height:170px;padding:0;background-image:linear-gradient(to right, #18181B 0%, rgba(24,24,27,0) 35%), url('${ASSET_BASE_URL}/banner-chef.webp');background-size:cover, cover;background-position:center, center center;background-repeat:no-repeat, no-repeat;">
                &nbsp;
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td background="${ASSET_BASE_URL}/${encodeURI('Iconos email medio/leaves-gold.png')}" style="background-image:url('${ASSET_BASE_URL}/${encodeURI('Iconos email medio/leaves-gold-flip.png')}'), url('${ASSET_BASE_URL}/${encodeURI('Iconos email medio/leaves-gold.png')}');background-repeat:no-repeat, no-repeat;background-position:left top, left bottom;background-size:220px auto, 260px auto;padding:32px;">${body}</td></tr>
        ${emailFooter('chef')}
        ${SCALLOP_BOTTOM_ROW}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email: confirmación de cuenta al registrarse ──────────────────────────────
function buildConfirmationEmail(name: string, confirmationLink: string): string {
  return shell(`
    ${greetingBlock({
      name,
      headline: 'Confirmá tu cuenta para empezar a recibir solicitudes.',
    })}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3F3F46;">
      Falta un paso: hacé click en el botón para confirmar tu email y activar
      tu perfil de chef en GetChef.
    </p>
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#92400E;">
        ⚠️ Este enlace es válido por <strong>24 horas</strong> y de un solo uso.
      </p>
    </div>
    ${ctaBand({
      title: 'Confirmá tu cuenta',
      subtitle: 'Un solo click y quedás listo para recibir solicitudes.',
      buttonLabel: 'Confirmar mi cuenta',
      href: confirmationLink,
    })}
    <p style="margin-top:20px;font-size:12px;color:#A1A1AA;">
      Si el botón no funciona, copia y pega este enlace:<br>
      <span style="color:#6366F1;word-break:break-all;">${confirmationLink}</span>
    </p>
  `, 'Confirmá tu cuenta')
}

export async function sendChefConfirmationEmail(opts: {
  email: string
  name: string
  confirmationLink: string
}): Promise<void> {
  if (!resend) {
    console.warn('[chef-emails] RESEND_API_KEY no configurado, omitiendo email de confirmación')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(opts.email),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(opts.email)}Confirmá tu cuenta de chef — GetChef`,
    html:    buildConfirmationEmail(opts.name, opts.confirmationLink),
  })

  if (error) console.error('[chef-emails] sendChefConfirmationEmail falló:', error)
}
