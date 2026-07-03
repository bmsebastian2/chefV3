'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Verifica que el usuario logueado sea admin antes de cualquier acción que use el
// service-role client (que bypassea RLS). Sin este guard, cualquiera podría girar.
async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role === 'admin'
}

// Igual que isAdmin() pero devuelve el id del admin (para registrarlo como autor de
// la acción con dinero: refunded_by / cancel). Con service-role auth.uid() es NULL,
// así que el id se resuelve acá desde la sesión y se pasa explícito a la RPC.
async function requireAdminId(): Promise<{ adminId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return { error: 'No autorizado' }
  return { adminId: user.id }
}

export async function releasePayout(
  bookingId: string,
  payoutRef?: string,
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('release_payout', {
    p_booking_id: bookingId,
    p_payout_ref: payoutRef ?? null,
  })
  if (error) {
    if (error.message?.includes('payout_window_not_reached')) {
      return { error: 'Todavía no pasó la ventana de 3 días desde que se completó' }
    }
    console.error('releasePayout:', error)
    return { error: 'No se pudo marcar el pago como girado' }
  }

  revalidatePath('/admin')
  return {}
}

// ── Iniciar reembolso: el admin cancela un booking activo → refund_pending ────
// Genera el "reembolso pendiente" que después se cierra con markRefund. Es la
// pieza que faltaba: sin esto, dentro de la ventana de 15 días no había forma de
// pasar un pago retenido a "a reembolsar".
export async function initRefund(
  bookingId: string,
  reason: string,
): Promise<{ error?: string }> {
  const { adminId, error: authError } = await requireAdminId()
  if (authError) return { error: authError }

  const trimmed = reason.trim()
  if (!trimmed) return { error: 'El motivo es obligatorio' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('admin_cancel_booking', {
    p_booking_id: bookingId,
    p_reason:     trimmed,
    p_admin_id:   adminId,
  })
  if (error) {
    if (error.message?.includes('cannot_cancel_released_payout')) {
      return { error: 'El pago ya fue girado al chef; no se puede reembolsar' }
    }
    console.error('initRefund:', error)
    return { error: 'No se pudo iniciar el reembolso' }
  }

  revalidatePath('/admin')
  return {}
}

// ── Cerrar reembolso de un BOOKING (la referencia del giro es obligatoria) ────
export async function markRefund(
  bookingId: string,
  refundRef: string,
): Promise<{ error?: string }> {
  const { adminId, error: authError } = await requireAdminId()
  if (authError) return { error: authError }

  const ref = refundRef.trim()
  if (!ref) return { error: 'La referencia del giro es obligatoria' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('mark_refund_processed', {
    p_booking_id: bookingId,
    p_refund_ref: ref,
    p_admin_id:   adminId,
  })
  if (error) {
    if (error.message?.includes('refund_ref_required')) {
      return { error: 'La referencia del giro es obligatoria' }
    }
    console.error('markRefund:', error)
    return { error: 'No se pudo marcar el reembolso' }
  }

  revalidatePath('/admin')
  return {}
}

// ── Cerrar reembolso de un pago HUÉRFANO (completed sin booking) ──────────────
export async function markOrphanRefund(
  paymentId: string,
  refundRef: string,
): Promise<{ error?: string }> {
  const { adminId, error: authError } = await requireAdminId()
  if (authError) return { error: authError }

  const ref = refundRef.trim()
  if (!ref) return { error: 'La referencia del giro es obligatoria' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('mark_orphan_payment_refunded', {
    p_payment_id: paymentId,
    p_refund_ref: ref,
    p_admin_id:   adminId,
  })
  if (error) {
    if (error.message?.includes('refund_ref_required')) {
      return { error: 'La referencia del giro es obligatoria' }
    }
    if (error.message?.includes('has booking')) {
      return { error: 'Este pago tiene reserva; usá el reembolso normal' }
    }
    console.error('markOrphanRefund:', error)
    return { error: 'No se pudo marcar el reembolso' }
  }

  revalidatePath('/admin')
  return {}
}

// ── Monitoreo de solicitudes (lazy) ──────────────────────────────────────────
// Lectura paginada de service_requests para el panel admin. Se dispara SOLO
// cuando el admin abre la sección y al cambiar filtros / pedir más — nunca al
// cargar /admin. Toda la query (filtros + paginado + resumen) corre en la RPC
// get_requests_admin; acá solo validamos rol y pasamos los parámetros.
//
// Tipos NO exportados a propósito: un archivo 'use server' solo puede exportar
// funciones async. La UI deriva estos tipos con
//   NonNullable<Awaited<ReturnType<typeof getRequestsForAdmin>>['data']>

// Tamaño de lote. La UI sabe si quedan más comparando filas acumuladas vs total.
const REQUESTS_PAGE_SIZE = 20

type AdminRequestRow = {
  id:               string
  created_at:       string
  status:           string
  service_type:     string
  occasion:         string | null
  city:             string | null
  location:         string | null
  event_date_start: string | null
  event_date_end:   string | null
  event_time:       string | null
  guests_adults:    number | null
  guests_teens:     number | null
  guests_kids:      number | null
  cuantas_personas: number | null
  cuisine_type:     string | null
  budget_min:       number | null
  budget_max:       number | null
  cancel_reason:    string | null
  client_name:      string
  client_email:     string | null
  proposals_count:  number
}

type RequestsSummary = {
  total_all:         number
  active:            number
  without_proposals: number
  cities:            { city: string; count: number }[]
}

type RequestsAdminResult = {
  rows:    AdminRequestRow[]
  total:   number
  summary: RequestsSummary
}

export async function getRequestsForAdmin(filters: {
  status?:      string
  serviceType?: string
  city?:        string
  dateFrom?:    string | null
  page?:        number
}): Promise<{ error?: string; data?: RequestsAdminResult }> {
  if (!(await isAdmin())) return { error: 'No autorizado' }

  const page = Math.max(0, filters.page ?? 0)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_requests_admin', {
    p_status:       filters.status      ?? 'new',
    p_service_type: filters.serviceType ?? null,
    p_city:         filters.city        ?? null,
    p_date_from:    filters.dateFrom     ?? null,
    p_limit:        REQUESTS_PAGE_SIZE,
    p_offset:       page * REQUESTS_PAGE_SIZE,
  })

  if (error) {
    console.error('getRequestsForAdmin:', error)
    return { error: 'No se pudieron cargar las solicitudes' }
  }

  return { data: data as RequestsAdminResult }
}

// ── Gestión de chefs (lazy) ───────────────────────────────────────────────────
// Lista de chefs para el panel admin con su estado y datos de pago (sensibles,
// solo admin). Se dispara SOLO al abrir la pestaña "Chefs". Lee con el admin
// client (service-role) → ve chef_payout_accounts pese a su RLS estricta.

type AdminChefRow = {
  chef_id:            string
  full_name:          string
  email:              string | null
  phone:              string | null
  city:               string | null
  country:            string | null
  experience_years:   number | null
  rating_avg:         number | null
  total_services:     number | null
  is_active:          boolean
  admin_blocked:      boolean
  admin_block_reason: string | null
  admin_blocked_at:   string | null
  created_at:         string | null
  payout: {
    account_holder: string | null
    bank_name:      string | null
    account_number: string | null
    account_type:   string | null
    document_id:    string | null
  } | null
}

export async function getChefsForAdmin(): Promise<{ error?: string; data?: AdminChefRow[] }> {
  if (!(await isAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()

  const { data: profiles, error } = await admin
    .from('chef_profiles')
    .select('id, user_id, city, country, experience_years, rating_avg, total_services, is_active, admin_blocked, admin_block_reason, admin_blocked_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getChefsForAdmin:', error)
    return { error: 'No se pudieron cargar los chefs' }
  }

  const rows = profiles ?? []
  const userIds = [...new Set(rows.map((r) => r.user_id as string).filter(Boolean))]
  const chefIds = rows.map((r) => r.id as string)

  // Datos de contacto (users) y datos bancarios (chef_payout_accounts) en lote.
  const [{ data: users }, { data: accounts }] = await Promise.all([
    userIds.length
      ? admin.from('users').select('id, first_name, first_surname, email, phone').in('id', userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    chefIds.length
      ? admin.from('chef_payout_accounts').select('chef_id, account_holder, bank_name, account_number, account_type, document_id').in('chef_id', chefIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const userById = Object.fromEntries((users ?? []).map((u) => [u.id as string, u]))
  const acctByChef = Object.fromEntries((accounts ?? []).map((a) => [a.chef_id as string, a]))

  const data: AdminChefRow[] = rows.map((r) => {
    const u = userById[r.user_id as string]
    const a = acctByChef[r.id as string]
    const fullName = [u?.first_name, u?.first_surname].filter(Boolean).join(' ') || 'Chef'
    return {
      chef_id:            r.id as string,
      full_name:          fullName,
      email:              (u?.email as string) ?? null,
      phone:              (u?.phone as string) ?? null,
      city:               (r.city as string) ?? null,
      country:            (r.country as string) ?? null,
      experience_years:   (r.experience_years as number) ?? null,
      rating_avg:         (r.rating_avg as number) ?? null,
      total_services:     (r.total_services as number) ?? null,
      is_active:          Boolean(r.is_active),
      admin_blocked:      Boolean(r.admin_blocked),
      admin_block_reason: (r.admin_block_reason as string) ?? null,
      admin_blocked_at:   (r.admin_blocked_at as string) ?? null,
      created_at:         (r.created_at as string) ?? null,
      payout: a
        ? {
            account_holder: (a.account_holder as string) ?? null,
            bank_name:      (a.bank_name as string) ?? null,
            account_number: (a.account_number as string) ?? null,
            account_type:   (a.account_type as string) ?? null,
            document_id:    (a.document_id as string) ?? null,
          }
        : null,
    }
  })

  return { data }
}

export async function setChefBlock(
  chefId: string,
  blocked: boolean,
  reason?: string,
): Promise<{ error?: string }> {
  // Necesitamos el id del admin (set_chef_block lo registra en admin_blocked_by);
  // con service-role auth.uid() es NULL, así que lo resolvemos acá.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('set_chef_block', {
    p_chef_id:  chefId,
    p_blocked:  blocked,
    p_reason:   blocked ? (reason ?? null) : null,
    p_admin_id: user.id,
  })

  if (error) {
    console.error('setChefBlock:', error)
    return { error: 'No se pudo actualizar el estado del chef' }
  }

  revalidatePath('/admin')
  return {}
}
