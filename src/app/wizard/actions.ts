'use server'
'use server'

import { after } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { WizardData, ClientExtras } from '@/components/wizard/types'
import { notifyMatchingChefs } from '@/lib/emails/notify-chefs'
import { sendClientEmails, RequestSummary } from '@/lib/emails/client-emails'

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
  'casual':    { min: 210, max: 263 },
  'gourmet':   { min: 263, max: 315 },
  'exclusive': { min: 315, max: 420 },
}

const GUESTS_RANGE_MAP: Record<string, number> = {
  '2':    2,
  '3-6':  4,
  '7-12': 9,
  '13+':  13,
}

const CUISINE_DISPLAY: Record<string, string> = {
  'local':         'Local',
  'italian':       'Italiana',
  'mediterranean': 'Mediterránea',
  'seafood':       'Mariscos/Pescados',
  'french':        'Francesa',
  'japanese':      'Japonesa',
  'fusion':        'Fusión',
  'chefs_special': 'A elección del Chef',
}

const BUDGET_DISPLAY: Record<string, string> = {
  'casual':    'Casual',
  'gourmet':   'Gourmet',
  'exclusive': 'Exclusivo',
}

const GUESTS_DISPLAY: Record<string, string> = {
  '2':    'Pareja (2 personas)',
  '3-6':  '3 a 6 personas',
  '7-12': '7 a 12 personas',
  '13+':  '13 o más personas',
}

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null
  return city.replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim() || null
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const SITE_URL = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// ─── registerOrVerifyClient ───────────────────────────────────────────────────

export async function registerOrVerifyClient(
  name: string,
  email: string,
  phone: string,
  password?: string
): Promise<{
  error?: string
  userId?: string
  isNewUser?: boolean
  tempPassword?: string
  confirmationLink?: string
}> {
  const supabase = await createClient()

  // 1. Buscar por email
  const { data: byEmail, error: emailCheckError } = await supabase
    .rpc('find_user_by_email', { p_email: email })

  if (emailCheckError) {
    console.error('Error checking user by email:', emailCheckError)
    return { error: 'Error al verificar usuario' }
  }

  if (byEmail && byEmail.length > 0) {
    const user = byEmail[0]
    if (user.user_role === 'chef') {
      return { error: 'Los chefs no pueden realizar solicitudes de servicio. Usa una cuenta de cliente.' }
    }
    // Caso A: cliente existente
    return { userId: user.user_id, isNewUser: false }
  }

  // 2. Buscar por teléfono
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
    // Caso A: cliente existente (identificado por teléfono)
    return { userId: user.user_id, isNewUser: false }
  }

  // 3. Caso B: usuario nuevo — admin.createUser para controlar el email de confirmación
  const admin = createAdminClient()
  const isPasswordProvided = !!password
  const finalPassword = password ?? `Tmp${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}Aa1!`

  const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: false,
    user_metadata: { full_name: name },
  })

  if (adminError) {
    const msg = adminError.message?.toLowerCase() ?? ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return { error: 'Este correo ya tiene una cuenta. Por favor inicia sesión.' }
    }
    console.error('Error creating admin user:', adminError)
    return { error: 'Error al crear cuenta' }
  }

  if (!adminData.user) {
    return { error: 'Error al crear cuenta' }
  }

  // 4. Registrar en public.users
  const { error: rpcError } = await supabase.rpc('register_client', {
    p_user_id:   adminData.user.id,
    p_email:     email,
    p_first_name: name,
    p_phone:     phone || null,
  })

  if (rpcError) {
    console.error('Error registering client in public.users:', rpcError)
    // Limpiar usuario huérfano en auth
    await admin.auth.admin.deleteUser(adminData.user.id).catch(() => {})
    return { error: 'Error al registrar usuario' }
  }

  // 5. Generar magic link — confirma el email E inicia sesión en un solo click
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback` },
  })

  if (linkError) {
    console.error('Error generating confirmation link:', linkError)
  }

  const rawLink = linkData?.properties?.action_link
  let confirmationLink: string | undefined
  if (rawLink) {
    try {
      const url = new URL(rawLink)
      url.searchParams.set('redirect_to', `${SITE_URL}/auth/callback`)
      confirmationLink = url.toString()
    } catch {
      confirmationLink = rawLink
    }
  }

  return {
    userId:           adminData.user.id,
    isNewUser:        true,
    // Solo se envía la contraseña en el email si fue auto-generada (el usuario no la eligió)
    tempPassword:     isPasswordProvided ? undefined : finalPassword,
    confirmationLink,
  }
}

// ─── submitServiceRequest ─────────────────────────────────────────────────────

export async function submitServiceRequest(
  data: WizardData,
  userId: string,
  extras?: ClientExtras
): Promise<{ error?: string; requestId?: string }> {
  const supabase = await createClient()

  const eventDateStart = data.date ?? data.dateRangeStart

  if (!data.location || !eventDateStart || !data.contact?.name || !data.contact?.email) {
    return { error: 'Faltan datos obligatorios para guardar la solicitud' }
  }

  const restrictions = data.dietaryRestrictions ?? []
  const notasArr: string[] = []
  if (restrictions.includes('Otras (Conversar con Chef)')) {
    notasArr.push('Restricciones adicionales — conversar con el chef')
  }

  const guestsAdults = data.guestsRange
    ? (GUESTS_RANGE_MAP[data.guestsRange] ?? 0)
    : (data.guestsAdults ?? 0)

  const budgetTier = data.budgetTier ? BUDGET_MAP[data.budgetTier] : null

  const eventTime = data.mealTime
    ? (MEAL_TIME_MAP[data.mealTime] ?? null)
    : (data.time ?? null)

  let eventDateEnd: string | null = null
  let guestsTeens = 0
  let guestsKids  = 0
  if (data.serviceType === '2') {
    const activeSlotDates = (data.mealSlots ?? [])
      .filter((s) => s.desayuno || s.almuerzo || s.cena)
      .map((s) => s.fecha)
      .sort()
    eventDateEnd = activeSlotDates.length > 0 ? activeSlotDates[activeSlotDates.length - 1] : null
    guestsTeens  = data.guestsTeens ?? 0
    guestsKids   = data.guestsKids  ?? 0
  }

  const { data: requestId, error } = await supabase.rpc('create_service_request', {
    p_user_id:            userId,
    p_service_type:       SERVICE_TYPE_MAP[data.serviceType ?? ''] ?? 'single',
    p_occasion:           OCCASION_MAP[data.occasion ?? ''] ?? data.occasion ?? 'other',
    p_location:           data.location.name,
    p_city:               normalizeCity(data.location.city),
    p_event_date_start:   formatLocalDate(new Date(eventDateStart as unknown as string)),
    p_event_date_end:     eventDateEnd,
    p_event_time:         eventTime,
    p_guests_adults:      guestsAdults,
    p_guests_teens:       guestsTeens,
    p_guests_kids:        guestsKids,
    p_cuisine_type:       CUISINE_MAP[data.cuisine ?? ''] ?? data.cuisine ?? null,
    p_descripcion_evento: data.details ?? null,
    p_contact_name:       data.contact.name,
    p_contact_email:      data.contact.email,
    p_contact_phone:      data.contact.phone ?? null,
    p_vegetariano:         restrictions.includes('Vegetariana') || restrictions.includes('Vegetariano'),
    p_vegano:              restrictions.includes('Vegano') || restrictions.includes('Vegana'),
    p_sin_gluten:          restrictions.includes('Sin Gluten') || restrictions.includes('Gluten'),
    p_sin_lactosa:         restrictions.includes('Sin Lácteos') || restrictions.includes('Lácteos'),
    p_sin_mariscos:        restrictions.includes('Marisco'),
    p_sin_frutos_secos:    restrictions.includes('Frutos Secos'),
    p_alergias_adicionales: data.dietaryOtras?.trim() || null,
    p_notas_adicionales:   notasArr.length > 0 ? notasArr.join('. ') : null,
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

  // Si es usuario nuevo, marcar el request como pending_confirmation via SECURITY DEFINER
  if (extras?.isNewUser) {
    const { error: statusError } = await supabase.rpc('set_request_pending', {
      p_request_id: newRequestId,
    })
    if (statusError) {
      console.error('Error setting pending_confirmation status:', statusError)
    }
  }

  // Presupuesto
  if (budgetTier) {
    const { error: budgetError } = await supabase.rpc('update_request_budget', {
      p_request_id: newRequestId,
      p_budget_min: budgetTier.min,
      p_budget_max: budgetTier.max,
    })
    if (budgetError) console.error('Error updating budget:', budgetError)
  }

  // Meal slots de servicio 2
  if (data.serviceType === '2') {
    const slots = (data.mealSlots ?? []).filter((s) => s.desayuno || s.almuerzo || s.cena)
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
      if (datesError) console.error('Error inserting request_dates:', datesError)
    }
  }

  const notifyPayload = {
    service_type:       SERVICE_TYPE_MAP[data.serviceType ?? ''] ?? 'single',
    occasion:           OCCASION_MAP[data.occasion ?? ''] ?? data.occasion ?? 'other',
    city:               data.location.city,
    event_date_start:   formatLocalDate(new Date(eventDateStart as unknown as string)),
    event_date_end:     eventDateEnd,
    event_time:         eventTime,
    cuantas_personas:   guestsAdults,
    cuisine_type:       CUISINE_MAP[data.cuisine ?? ''] ?? data.cuisine ?? null,
    budget_min:         budgetTier?.min ?? null,
    budget_max:         budgetTier?.max ?? null,
    descripcion_evento: data.details ?? null,
    mealSlots:          data.serviceType === '2'
                          ? (data.mealSlots ?? []).filter((s) => s.desayuno || s.almuerzo || s.cena)
                          : undefined,
  }

  const clientEmail = data.contact.email!
  const clientName  = data.contact.name!

  const restrictionLabels = restrictions.filter((r) => r !== 'Otras (Conversar con Chef)')
  const requestSummary: RequestSummary = {
    lugar:        data.location?.name,
    hora:         data.mealTime ? (MEAL_TIME_MAP[data.mealTime] ?? undefined) : undefined,
    fecha:        eventDateStart
                    ? `${(eventDateStart as unknown as Date).getDate()} de ${MONTHS_ES[(eventDateStart as unknown as Date).getMonth()]} de ${(eventDateStart as unknown as Date).getFullYear()}`
                    : undefined,
    comensales:   data.guestsRange ? GUESTS_DISPLAY[data.guestsRange] : undefined,
    precio:       budgetTier ? `desde $${budgetTier.min} a $${budgetTier.max} USD` : undefined,
    experiencia:  data.budgetTier ? BUDGET_DISPLAY[data.budgetTier] : undefined,
    gastronomia:  data.cuisine ? (CUISINE_DISPLAY[data.cuisine] ?? data.cuisine) : undefined,
    restricciones: restrictionLabels.length > 0 ? restrictionLabels.join(', ') : 'No',
    ocasion:      data.occasion ?? undefined,
    notas:        data.details ?? undefined,
    mealSlots:    data.serviceType === '2'
                    ? (data.mealSlots ?? []).filter((s) => s.desayuno || s.almuerzo || s.cena)
                    : undefined,
  }

  // Para usuarios nuevos, los chefs se notifican solo después de confirmar el email
  // (en /auth/callback). Para usuarios existentes, notificar de inmediato.
  after(() =>
    Promise.all([
      ...(extras?.isNewUser
        ? []
        : [notifyMatchingChefs(newRequestId, notifyPayload).catch((err) =>
            console.error('[wizard] notifyMatchingChefs threw:', err)
          )]
      ),
      sendClientEmails({
        email:            clientEmail,
        name:             clientName,
        isNewUser:        extras?.isNewUser ?? false,
        tempPassword:     extras?.tempPassword,
        confirmationLink: extras?.confirmationLink,
        requestSummary,
      }).catch((err) =>
        console.error('[wizard] sendClientEmails threw:', err)
      ),
    ])
  )

  return { requestId: newRequestId }
}

// ─── submitWeeklyRequest ──────────────────────────────────────────────────────
// Requires two DB changes before this runs:
//   1. ALTER TABLE weekly_meal_details ALTER COLUMN frecuencia_cocina TYPE text;
//   2. CREATE FUNCTION insert_weekly_meal_details(...) SECURITY DEFINER — see below:
//
//   create or replace function insert_weekly_meal_details(
//     p_request_id uuid, p_codigo_postal text, p_comidas_por_semana int,
//     p_raciones_por_comida int, p_frecuencia_cocina text,
//     p_preferencia_chef text, p_preferencias_culinarias text
//   ) returns void language plpgsql security definer as $$
//   begin
//     insert into weekly_meal_details (request_id, codigo_postal, comidas_por_semana,
//       raciones_por_comida, frecuencia_cocina, preferencia_chef, preferencias_culinarias)
//     values (p_request_id, p_codigo_postal, p_comidas_por_semana, p_raciones_por_comida,
//       p_frecuencia_cocina, p_preferencia_chef, p_preferencias_culinarias);
//   end; $$;

export async function submitWeeklyRequest(
  data: WizardData,
  userId: string,
  extras?: ClientExtras
): Promise<{ error?: string; requestId?: string }> {
  const supabase = await createClient()

  if (!data.location || !data.date || !data.contact?.name || !data.contact?.email) {
    return { error: 'Faltan datos obligatorios' }
  }

  const restrictions = data.dietaryRestrictions ?? []
  const raciones     = data.weeklyDetails?.racionesPorComida ?? 1

  const { data: requestId, error } = await supabase.rpc('create_service_request', {
    p_user_id:              userId,
    p_service_type:         'weekly',
    p_occasion:             'other',
    p_location:             data.location.name,
    p_city:                 normalizeCity(data.location.city),
    p_event_date_start:     formatLocalDate(new Date(data.date as unknown as string)),
    p_event_date_end:       null,
    p_event_time:           null,
    p_guests_adults:        raciones,
    p_guests_teens:         0,
    p_guests_kids:          0,
    p_cuisine_type:         null,
    p_descripcion_evento:   data.weeklyDetails?.preferenciasCulinarias ?? null,
    p_contact_name:         data.contact.name,
    p_contact_email:        data.contact.email,
    p_contact_phone:        data.contact.phone ?? null,
    p_vegetariano:          restrictions.includes('Vegetariana') || restrictions.includes('Vegetariano'),
    p_vegano:               restrictions.includes('Vegano')      || restrictions.includes('Vegana'),
    p_sin_gluten:           restrictions.includes('Gluten'),
    p_sin_lactosa:          restrictions.includes('Lácteos'),
    p_sin_mariscos:         restrictions.includes('Mariscos'),
    p_sin_frutos_secos:     restrictions.includes('Frutos secos'),
    p_alergias_adicionales: null,
    p_notas_adicionales:    null,
  })

  if (error) {
    console.error('[weekly] Error saving service request:', error)
    return { error: 'Error al guardar la solicitud' }
  }

  const newRequestId = requestId as string
  if (!newRequestId) return { error: 'Error al guardar la solicitud' }

  if (extras?.isNewUser) {
    const { error: statusError } = await supabase.rpc('set_request_pending', {
      p_request_id: newRequestId,
    })
    if (statusError) console.error('[weekly] Error setting pending status:', statusError)
  }

  // Insertar weekly_meal_details (requiere RPC definida arriba)
  const diasStr = (data.weeklyDetails?.frecuenciaCocina ?? []).join(',')
  const { error: weeklyError } = await supabase.rpc('insert_weekly_meal_details', {
    p_request_id:              newRequestId,
    p_codigo_postal:           data.weeklyDetails?.codigoPostal           ?? null,
    p_comidas_por_semana:      data.weeklyDetails?.comidasPorSemana        ?? null,
    p_raciones_por_comida:     data.weeklyDetails?.racionesPorComida       ?? null,
    p_frecuencia_cocina:       diasStr || null,
    p_preferencia_chef:        data.weeklyDetails?.preferenciaChef         ?? null,
    p_preferencias_culinarias: data.weeklyDetails?.preferenciasCulinarias  ?? null,
  })
  if (weeklyError) console.error('[weekly] Error saving weekly_meal_details:', weeklyError)

  const eventDate  = new Date(data.date as unknown as string)
  const requestSummary: RequestSummary = {
    lugar:         data.location.name,
    fecha:         `${eventDate.getDate()} de ${MONTHS_ES[eventDate.getMonth()]} de ${eventDate.getFullYear()}`,
    comensales:    `${raciones} ${raciones === 1 ? 'persona' : 'personas'}`,
    restricciones: restrictions.length > 0 ? restrictions.join(', ') : 'No',
    notas:         data.weeklyDetails?.preferenciasCulinarias ?? undefined,
  }

  const notifyPayload = {
    service_type:       'weekly',
    occasion:           'other',
    city:               data.location.city,
    event_date_start:   formatLocalDate(eventDate),
    event_date_end:     null,
    event_time:         null,
    cuantas_personas:   raciones,
    cuisine_type:       null,
    budget_min:         null,
    budget_max:         null,
    descripcion_evento: data.weeklyDetails?.preferenciasCulinarias ?? null,
  }

  after(() =>
    Promise.all([
      ...(extras?.isNewUser
        ? []
        : [notifyMatchingChefs(newRequestId, notifyPayload).catch((err) =>
            console.error('[weekly] notifyMatchingChefs threw:', err)
          )]
      ),
      sendClientEmails({
        email:            data.contact!.email!,
        name:             data.contact!.name!,
        isNewUser:        extras?.isNewUser        ?? false,
        tempPassword:     extras?.tempPassword,
        confirmationLink: extras?.confirmationLink,
        requestSummary,
      }).catch((err) =>
        console.error('[weekly] sendClientEmails threw:', err)
      ),
    ])
  )

  return { requestId: newRequestId }
}
