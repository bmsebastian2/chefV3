import { Resend } from 'resend'

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Dominio verificado en Resend (DKIM/SPF/DMARC ok) — único remitente de la app.
export const FROM_EMAIL = 'GetChef <noreply@getcheftoday.com>'
export const REPLY_TO = 'getchef.com@gmail.com'

// Fuera de producción (dev/preview), los envíos se redirigen a RESEND_DEV_EMAIL
// para no mandar emails reales a chefs/clientes mientras se desarrolla.
const IS_PROD = process.env.NODE_ENV === 'production'

export function resolveRecipient(email: string): string {
  if (IS_PROD) return email
  return process.env.RESEND_DEV_EMAIL ?? email
}

export function testSubjectPrefix(email: string): string {
  return IS_PROD ? '' : `[TEST → ${email}] `
}
