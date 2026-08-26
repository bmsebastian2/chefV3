'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { resend, FROM_EMAIL, REPLY_TO, resolveRecipient, testSubjectPrefix } from '@/lib/resend'
import { emailFooter, ctaBand, greetingBlock, detailBlock, iconUrl, EMAIL_RESPONSIVE_STYLES, ASSET_BASE_URL, SITE_URL } from './shared'

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
// Sin exportar: la reusan buildConfirmationEmail y buildCompletionReminderEmail,
// ambas en este mismo archivo, para no duplicar header/scallops/footer.
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

// ── Email: recordatorio de perfil incompleto ──────────────────────────────────
// Shape que devuelve compute_chef_missing_requirements() (SQL) — ver
// MIGRATION_chef_completion_reminder.sql. 'key' identifica el requisito para
// elegir ícono acá; el resto ya viene listo para mostrar.
export type ChefMissingRequirement = {
  key: 'profile_picture' | 'gallery' | 'menus' | 'dishes' | (string & {})
  label: string
  current: number
  required: number
  href: string
}

// Sin ícono dorado propio para foto/galería en el set de shared.ts (pensado
// para "Detalles del servicio", no para checklist de perfil) — se usa emoji
// de fallback ahí, e íconos existentes donde ya calzan (nota→menús, cubiertos→platos).
const MISSING_ICON: Record<string, string> = {
  profile_picture: '📷',
  gallery: '🖼️',
  menus: 'nota',
  dishes: 'cubiertos',
}

function buildCompletionReminderEmail(name: string, missing: ChefMissingRequirement[]): string {
  const firstHref = missing[0]?.href ?? '/dashboard'

  return shell(`
    ${greetingBlock({
      name,
      headline: 'Todavía no estás recibiendo solicitudes de clientes.',
      detailLine: 'Mientras tu perfil no cumpla estos mínimos, no vas a aparecer para nadie que busque un chef.',
    })}
    ${detailBlock(missing.map(m => [
      MISSING_ICON[m.key] ?? '•',
      m.label,
      `${m.current} de ${m.required}`,
    ]))}
    ${ctaBand({
      title: 'Completá tu perfil',
      subtitle: 'Un par de fotos y platos más y ya podés empezar a recibir solicitudes.',
      buttonLabel: 'Completar mi perfil',
      href: `${SITE_URL}${firstHref}`,
    })}
  `, 'Completá tu perfil')
}

// Devuelve si el envío salió bien — el cron lo usa para decidir si marca el
// recordatorio como enviado (reminder_count/last_sent_at) o lo deja tal cual
// para reintentar en la próxima corrida.
export async function sendChefCompletionReminderEmail(opts: {
  email: string
  name: string
  missing: ChefMissingRequirement[]
}): Promise<boolean> {
  if (!resend) {
    console.warn('[chef-emails] RESEND_API_KEY no configurado, omitiendo recordatorio de perfil')
    return false
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(opts.email),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(opts.email)}Todavía no recibís solicitudes — completá tu perfil`,
    html:    buildCompletionReminderEmail(opts.name, opts.missing),
  })

  if (error) {
    console.error('[chef-emails] sendChefCompletionReminderEmail falló:', error)
    return false
  }
  return true
}

// ── Email: mensaje nuevo del cliente en el chat de una propuesta ─────────────
// A propósito NO incluye el texto del mensaje: mismo motivo que el filtro de
// chat-moderation.ts (contacto directo por fuera de la app) — el email solo
// avisa y lleva de vuelta a la conversación en el dashboard.
function buildNewChefMessageEmail(chefName: string, clientName: string, href: string): string {
  return shell(`
    ${greetingBlock({
      name: chefName,
      headline: `${clientName} te escribió un mensaje nuevo.`,
      detailLine: 'Entrá a la conversación para verlo y responder.',
    })}
    ${ctaBand({
      title: `Tenés un mensaje de ${clientName}`,
      subtitle: 'Respondé desde la conversación en tu dashboard.',
      buttonLabel: 'Ver conversación',
      href,
    })}
  `, 'Mensaje nuevo')
}

/**
 * Avisa al chef de un mensaje nuevo del cliente. Idempotente vía claim
 * atómico sobre proposals.chef_msg_alert_sent_at (mismo patrón que
 * notifyChefOfBookingConfirmed en notify-chefs.ts): si ya hay un aviso sin
 * leer para esta conversación, no se reenvía — evita un email por cada
 * mensaje de una conversación activa. mark_conversation_read() resetea la
 * columna cuando el chef abre el chat (ver MIGRATION_message_alerts.sql).
 */
export async function notifyChefOfNewMessage(proposalId: string, clientName: string): Promise<void> {
  const admin = createAdminClient()

  const { data: claimed, error: claimError } = await admin
    .from('proposals')
    .update({ chef_msg_alert_sent_at: new Date().toISOString() })
    .eq('id', proposalId)
    .is('chef_msg_alert_sent_at', null)
    .select('chef_id, request_id')
    .maybeSingle()

  if (claimError) {
    console.error('[notifyChefOfNewMessage] claim falló:', claimError)
    return
  }
  if (!claimed) return // ya hay un aviso sin leer para esta conversación

  const { data: chef, error: chefError } = await admin
    .from('chef_profiles')
    .select('user_id, admin_blocked, users!inner(email, first_name)')
    .eq('id', claimed.chef_id)
    .single()

  if (chefError || !chef) {
    console.error('[notifyChefOfNewMessage] chef fetch falló:', chefError)
    return
  }
  if (chef.admin_blocked) return

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(chef.user_id as string)
  if (authError || !authUser.user?.email_confirmed_at) return // email sin confirmar

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chefUsers = (chef as any).users
  const chefUser = Array.isArray(chefUsers) ? chefUsers[0] : chefUsers

  if (!resend) {
    console.warn('[notifyChefOfNewMessage] RESEND_API_KEY no configurado, omitiendo email')
    return
  }

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      resolveRecipient(chefUser.email),
    replyTo: REPLY_TO,
    subject: `${testSubjectPrefix(chefUser.email)}${clientName} te escribió — GetChef`,
    html: buildNewChefMessageEmail(chefUser.first_name, clientName, `${SITE_URL}/dashboard/requests/${claimed.request_id}`),
  })

  if (error) console.error('[notifyChefOfNewMessage] send falló:', error)
}
