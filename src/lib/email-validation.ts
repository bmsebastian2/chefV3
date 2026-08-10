// Validación de formato + dominios de descarte, compartida por registro de
// chef (auth/actions.ts) y alta de cliente del wizard (wizard/actions.ts).
// No duplicar estas reglas en los formularios: importar de acá.
//
// Esto NO detecta emails inexistentes con formato válido — eso requiere
// confirmación de email (fuera de alcance de esta validación).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Lista conservadora: dominios de ejemplo/prueba (RFC 2606) y proveedores de
// email desechable conocidos. No incluye ISPs regionales ni webmail genérico
// para evitar falsos positivos.
const DISCARD_DOMAINS = new Set([
  'example.com', 'example.net', 'example.org', 'example.edu',
  'test.com', 'test.org',
  'mailinator.com',
  'yopmail.com',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org',
  'trashmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'getnada.com',
  'fakeinbox.com',
])

export function validateEmail(email: string): { valid: boolean; message: string } {
  const trimmed = email.trim()

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Ingresá un email válido.' }
  }

  const domain = trimmed.split('@')[1]?.toLowerCase()
  if (domain && DISCARD_DOMAINS.has(domain)) {
    return { valid: false, message: 'Ese dominio de email no es válido. Usá tu email real.' }
  }

  return { valid: true, message: '' }
}
