import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Mismos remitentes que el resto del proyecto (src/lib/emails/client-emails.ts)
const FROM = process.env.RESEND_FROM_EMAIL
  ? `GetChef <${process.env.RESEND_FROM_EMAIL}>`
  : 'GetChef <onboarding@resend.dev>'

// Destinatario de los mensajes de contacto
const CONTACT_TO = process.env.RESEND_DEV_EMAIL

// Límites anti-spam
const LIMITS = { name: 80, email: 120, message: 3000 } as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: Request) {
  if (!resend || !CONTACT_TO) {
    console.error('[contact] Resend o RESEND_DEV_EMAIL no configurado')
    return NextResponse.json({ error: 'El servicio de contacto no está disponible.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const { name, email, message } = (body ?? {}) as Record<string, unknown>

  // Validación server-side — no confiar en el frontend
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return NextResponse.json({ error: 'Campos inválidos.' }, { status: 400 })
  }

  const cleanName = name.trim()
  const cleanEmail = email.trim()
  const cleanMessage = message.trim()

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return NextResponse.json({ error: 'El email no tiene un formato válido.' }, { status: 400 })
  }
  if (
    cleanName.length > LIMITS.name ||
    cleanEmail.length > LIMITS.email ||
    cleanMessage.length > LIMITS.message
  ) {
    return NextResponse.json({ error: 'Algún campo supera el largo permitido.' }, { status: 400 })
  }

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#18181B;">
      <h2 style="margin:0 0 16px;">Nuevo mensaje de contacto</h2>
      <p style="margin:0 0 4px;"><strong>Nombre:</strong> ${escapeHtml(cleanName)}</p>
      <p style="margin:0 0 16px;"><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
      <p style="margin:0 0 6px;"><strong>Mensaje:</strong></p>
      <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(cleanMessage)}</p>
    </div>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: CONTACT_TO,
    replyTo: cleanEmail,
    subject: `Contacto GetChef — ${cleanName}`,
    html,
  })

  if (error) {
    console.error('[contact] envío falló:', error)
    return NextResponse.json({ error: 'No se pudo enviar el mensaje. Intentá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
