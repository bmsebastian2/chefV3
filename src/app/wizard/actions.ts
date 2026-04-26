'use server'

import { createClient } from '@/utils/supabase/server'
import { WizardData } from '@/components/wizard/types'

// ─── Mapeos Wizard → DB ───────────────────────────────────────────────────────

const OCCASION_MAP: Record<string, string> = {
  'Cumpleaños':             'birthday',
  'Reunión familiar':       'family_reunion',
  'Despedida de soltero/a': 'bachelor_party',
  'Reunión con amigos':     'friends_gathering',
  'Cena romántica':         'romantic_dinner',
  'Evento corporativo':     'corporate',
  'Aventura gastronómica':  'gastronomic',
  'Otra':                   'other',
}

const SERVICE_TYPE_MAP: Record<string, string> = {
  '1': 'single',
  '2': 'multiple',
  '3': 'weekly',
}

// 'Asiática' y 'Mexicana' no existen en el enum de la DB → null
const CUISINE_MAP: Record<string, string | null> = {
  'Mediterránea': 'mediterranean',
  'Asiática':     null,
  'Fusión':       'fusion',
  'Italiana':     'italian',
  'Mexicana':     null,
  'Sorpréndeme':  'chefs_special',
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function extractCity(locationName: string): string {
  const parts = locationName.split(',')
  return parts[parts.length - 1].trim()
}

export async function registerOrVerifyClient(
  name: string,
  email: string,
  phone: string
): Promise<{ error?: string; userId?: string }> {
  const supabase = await createClient()

  // 1. Check by email first
  const { data: byEmail, error: emailCheckError } = await supabase
    .rpc('get_user_by_email', { p_email: email })

  if (emailCheckError) {
    console.error('Error checking user by email:', emailCheckError)
    return { error: 'Error al verificar usuario' }
  }

  if (byEmail && byEmail.length > 0) {
    const user = byEmail[0]
    if (user.user_role === 'chef') {
      return { error: 'Los chefs no pueden realizar solicitudes de servicio. Usa una cuenta de cliente.' }
    }
    return { userId: user.user_id }
  }

  // 2. Email not found — check by phone before attempting to create
  const { data: byPhone, error: phoneCheckError } = await supabase
    .rpc('get_user_by_phone', { p_phone: phone })

  if (phoneCheckError) {
    console.error('Error checking user by phone:', phoneCheckError)
    return { error: 'Error al verificar usuario' }
  }

  if (byPhone && byPhone.length > 0) {
    const user = byPhone[0]
    if (user.user_role === 'chef') {
      return { error: 'Los chefs no pueden realizar solicitudes de servicio. Usa una cuenta de cliente.' }
    }
    return { userId: user.user_id }
  }

  // 3. Truly new user — create Supabase Auth account with a temporary password.
  //    They can claim the account later via "Olvidé mi contraseña".
  const tempPassword = `${crypto.randomUUID().replace(/-/g, '')}Aa1!`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: tempPassword,
  })

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      return { error: 'Este correo ya tiene una cuenta. Por favor inicia sesión.' }
    }
    return { error: 'Error al crear cuenta' }
  }

  if (!authData.user) {
    return { error: 'Error al crear cuenta' }
  }

  // 4. Register in public.users — ON CONFLICT handles any orphaned auth users
  const { error: rpcError } = await supabase.rpc('register_client', {
    p_user_id: authData.user.id,
    p_email: email,
    p_first_name: name,
    p_phone: phone || null,
  })

  if (rpcError) {
    console.error('Error registering client in public.users:', rpcError)
    return { error: 'Error al registrar usuario' }
  }

  return { userId: authData.user.id }
}

export async function submitServiceRequest(
  data: WizardData,
  userId: string
): Promise<{ error?: string; requestId?: string }> {
  const supabase = await createClient()

  if (!data.location || !data.date || !data.contact?.name || !data.contact?.email) {
    return { error: 'Faltan datos obligatorios para guardar la solicitud' }
  }

  const restrictions = data.dietaryRestrictions ?? []
  const notasArr: string[] = []
  if (restrictions.includes('Otras (Conversar con Chef)')) {
    notasArr.push('Restricciones adicionales — conversar con el chef')
  }

  const { data: requestId, error } = await supabase.rpc('create_service_request', {
    p_user_id:            userId,
    p_service_type:       SERVICE_TYPE_MAP[data.serviceType ?? ''] ?? 'single',
    p_occasion:           OCCASION_MAP[data.occasion ?? ''] ?? 'other',
    p_location:           data.location.name,
    p_city:               extractCity(data.location.name),
    p_event_date_start:   formatLocalDate(new Date(data.date as unknown as string)),
    p_event_time:         data.time ?? null,
    p_guests_adults:      data.guestsAdults ?? 0,
    p_cuisine_type:       CUISINE_MAP[data.cuisine ?? ''] ?? null,
    p_descripcion_evento: data.details ?? null,
    p_contact_name:       data.contact.name,
    p_contact_email:      data.contact.email,
    p_contact_phone:      data.contact.phone ?? null,
    p_vegetariano:        restrictions.includes('Vegetariana'),
    p_vegano:             restrictions.includes('Vegana'),
    p_sin_gluten:         restrictions.includes('Sin Gluten'),
    p_sin_lactosa:        restrictions.includes('Sin Lácteos'),
    p_notas_adicionales:  notasArr.length > 0 ? notasArr.join('. ') : null,
  })

  if (error) {
    console.error('Error saving service request:', error)
    return { error: 'Error al guardar la solicitud' }
  }

  return { requestId: requestId as string }
}
