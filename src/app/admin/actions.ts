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

export async function markRefund(
  bookingId: string,
  refundRef?: string,
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: 'No autorizado' }

  const admin = createAdminClient()
  const { error } = await admin.rpc('mark_refund_processed', {
    p_booking_id: bookingId,
    p_refund_ref: refundRef ?? null,
  })
  if (error) {
    console.error('markRefund:', error)
    return { error: 'No se pudo marcar el reembolso' }
  }

  revalidatePath('/admin')
  return {}
}
