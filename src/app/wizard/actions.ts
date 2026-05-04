'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

const CUISINE_MAP: Record<string, string> = {
  'local':        'local',
  'italian':      'italian',
  'mediterranean':'mediterranean',
  'seafood':      'seafood',
  'french':       'french',
  'japanese':     'japanese',
  'fusion':       'fusion',
  'chefs_special':'chefs_special',
}

const MEAL_TIME_MAP: Record<string, string> = {
  'lunch':  'Comida',
  'dinner': 'Cena',
}

const BUDGET_MAP: Record<string, { min: number; max: number }> = {
  'casual':    { min: 2772, max: 3119 },
  'gourmet':   { min: 3119, max: 3465 },
  'exclusive': { min: 3465, max: 4158 },
}

// Guests range → representative adult count
const GUESTS_RANGE_MAP: Record<string, number> = {
  '2':    2,
  '3-6':  4,
  '7-12': 9,
  '13+':  13,
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
  phone: string,
  password?: string
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

  // 3. Truly new user — crear cuenta con la contraseña elegida por el usuario
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: password ?? `${crypto.randomUUID().replace(/-/g, '')}Aa1!`,
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

  // Servicio 1 usa data.date; servicio 2 usa data.dateRangeStart
  const eventDateStart = data.date ?? data.dateRangeStart

  if (!data.location || !eventDateStart || !data.contact?.name || !data.contact?.email) {
    return { error: 'Faltan datos obligatorios para guardar la solicitud' }
  }

  const restrictions = data.dietaryRestrictions ?? []
  const notasArr: string[] = []
  if (restrictions.includes('Otras (Conversar con Chef)')) {
    notasArr.push('Restricciones adicionales — conversar con el chef')
  }
  if (restrictions.includes('Sí')) {
    notasArr.push('El cliente tiene restricciones alimentarias — coordinar con el chef')
  }

  // Guests: service 1 usa guestsRange (rango estático), service 2 usa contadores individuales
  const guestsAdults = data.guestsRange
    ? (GUESTS_RANGE_MAP[data.guestsRange] ?? 0)
    : (data.guestsAdults ?? 0)

  // Budget: servicio 1 y 2 usan budgetTier
  const budgetTier = data.budgetTier ? BUDGET_MAP[data.budgetTier] : null

  // Event time: service 1 usa mealTime (Comida/Cena), service 2 no usa este campo
  const eventTime = data.mealTime
    ? (MEAL_TIME_MAP[data.mealTime] ?? null)
    : (data.time ?? null)

  const { data: requestId, error } = await supabase.rpc('create_service_request', {
    p_user_id:            userId,
    p_service_type:       SERVICE_TYPE_MAP[data.serviceType ?? ''] ?? 'single',
    p_occasion:           OCCASION_MAP[data.occasion ?? ''] ?? data.occasion ?? 'other',
    p_location:           data.location.name,
    p_city:               extractCity(data.location.name),
    p_event_date_start:   formatLocalDate(new Date(eventDateStart as unknown as string)),
    p_event_time:         eventTime,
    p_guests_adults:      guestsAdults,
    p_cuisine_type:       CUISINE_MAP[data.cuisine ?? ''] ?? data.cuisine ?? null,
    p_descripcion_evento: data.details ?? null,
    p_contact_name:       data.contact.name,
    p_contact_email:      data.contact.email,
    p_contact_phone:      data.contact.phone ?? null,
    p_vegetariano:        restrictions.includes('Vegetariana') || restrictions.includes('Vegetariano'),
    p_vegano:             restrictions.includes('Vegana'),
    p_sin_gluten:         restrictions.includes('Sin Gluten') || restrictions.includes('Gluten'),
    p_sin_lactosa:        restrictions.includes('Sin Lácteos') || restrictions.includes('Lácteos'),
    p_notas_adicionales:  notasArr.length > 0 ? notasArr.join('. ') : null,
  })

  if (error) {
    console.error('Error saving service request:', error)
    return { error: 'Error al guardar la solicitud' }
  }

  const newRequestId = requestId as string

  if (!newRequestId) {
    console.error('create_service_request returned no ID')
    return { error: 'Error al guardar la solicitud' }
  }

  const admin = createAdminClient()

  // Update budget via SECURITY DEFINER — bypasses RLS without needing service_role grants
  if (budgetTier) {
    const { error: budgetError } = await supabase.rpc('update_request_budget', {
      p_request_id: newRequestId,
      p_budget_min: budgetTier.min,
      p_budget_max: budgetTier.max,
    })
    if (budgetError) {
      console.error('Error updating budget:', budgetError)
    }
  }

  // Campos adicionales de servicio 2: fecha fin, desglose de invitados y meal slots
  if (data.serviceType === '2') {
    const service2Updates: Record<string, unknown> = {}
    if (data.dateRangeEnd) {
      service2Updates.event_date_end = formatLocalDate(new Date(data.dateRangeEnd as unknown as string))
    }
    if (data.guestsTeens != null) service2Updates.guests_teens = data.guestsTeens
    if (data.guestsKids  != null) service2Updates.guests_kids  = data.guestsKids
    const totalGuests = (data.guestsAdults ?? 0) + (data.guestsTeens ?? 0) + (data.guestsKids ?? 0)
    if (totalGuests > 0) service2Updates.cuantas_personas = totalGuests

    if (Object.keys(service2Updates).length > 0) {
      const { error: s2Error } = await admin
        .from('service_requests')
        .update(service2Updates)
        .eq('id', newRequestId)
      if (s2Error) {
        console.error('Error updating service_2 fields:', s2Error)
      }
    }

    // Insertar meal slots en request_dates (solo días con al menos una comida seleccionada)
    const slots = (data.mealSlots ?? []).filter(
      (s) => s.desayuno || s.almuerzo || s.cena
    )
    if (slots.length > 0) {
      const { error: datesError } = await supabase.rpc('insert_request_dates', {
        p_request_id: newRequestId,
        p_slots:      slots.map((s) => ({
          fecha:    s.fecha,
          desayuno: s.desayuno,
          almuerzo: s.almuerzo,
          cena:     s.cena,
        })),
      })
      if (datesError) {
        console.error('Error inserting request_dates:', datesError)
      }
    }
  }

  // Update extra restriction fields not covered by the RPC
  const hasExtraRestrictions =
    restrictions.includes('Marisco') ||
    restrictions.includes('Frutos Secos') ||
    data.dietaryOtras?.trim()

  if (hasExtraRestrictions) {
    const { error: restrictError } = await admin
      .from('request_restrictions')
      .update({
        sin_mariscos:         restrictions.includes('Marisco'),
        sin_frutos_secos:     restrictions.includes('Frutos Secos'),
        alergias_adicionales: data.dietaryOtras?.trim() || null,
      })
      .eq('request_id', newRequestId)
    if (restrictError) {
      console.error('Error updating request_restrictions:', restrictError)
    }
  }

  return { requestId: newRequestId }
}
