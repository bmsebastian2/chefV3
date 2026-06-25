'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function acceptProposal(
  proposalId: string,
  requestId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: request } = await supabase
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!request) return { error: 'Solicitud no encontrada' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)
    .eq('request_id', requestId)
  if (error) return { error: error.message }

  revalidatePath(`/client-dashboard/${requestId}/proposals`)
  revalidatePath(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  return {}
}

export async function rejectProposal(
  proposalId: string,
  requestId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: request } = await supabase
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!request) return { error: 'Solicitud no encontrada' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('id', proposalId)
    .eq('request_id', requestId)
  if (error) return { error: error.message }

  revalidatePath(`/client-dashboard/${requestId}/proposals`)
  revalidatePath(`/client-dashboard/${requestId}/proposals/${proposalId}`)
  return {}
}

// ── Ciclo de vida del booking ────────────────────────────────────────────────

export async function completeBooking(
  bookingId: string,
  requestId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // complete_booking verifica adentro la propiedad (sr.user_id = auth.uid()).
  const { error } = await supabase.rpc('complete_booking', {
    p_booking_id: bookingId,
  })
  if (error) {
    console.error('completeBooking:', error)
    return { error: 'No se pudo marcar el servicio como completado' }
  }

  revalidatePath(`/client-dashboard/${requestId}/proposals`)
  return {}
}

export async function cancelBooking(
  bookingId: string,
  requestId: string,
  reason?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason:     reason ?? null,
  })
  if (error) {
    // Ventana de cancelación cerrada (<15 días) → mensaje específico.
    if (error.message?.includes('cancellation_window_closed')) {
      return { error: 'Faltan menos de 15 días para tu evento. Contactá a soporte para cancelar.' }
    }
    console.error('cancelBooking:', error)
    return { error: 'No se pudo cancelar la reserva' }
  }

  revalidatePath(`/client-dashboard/${requestId}/proposals`)
  return {}
}

export async function submitReview(
  bookingId: string,
  requestId: string,
  ratings: { chef: number; food: number; presentation: number; cleanliness: number },
  comment?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('submit_review', {
    p_booking_id:          bookingId,
    p_rating_chef:         ratings.chef,
    p_rating_food:         ratings.food,
    p_rating_presentation: ratings.presentation,
    p_rating_cleanliness:  ratings.cleanliness,
    p_comment:             comment ?? null,
  })
  if (error) {
    if (error.message?.includes('already_reviewed')) {
      return { error: 'Ya dejaste una reseña para este servicio' }
    }
    console.error('submitReview:', error)
    return { error: 'No se pudo enviar la reseña' }
  }

  revalidatePath(`/client-dashboard/${requestId}/proposals/${bookingId}`)
  revalidatePath(`/client-dashboard/${requestId}/proposals`)
  return {}
}

export async function getMessages(proposalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('messages')
    .select('id, sender_id, sender_name, content, is_read, sent_at')
    .eq('proposal_id', proposalId)
    .order('sent_at', { ascending: true })
  return data ?? []
}

export async function sendClientMessage(
  proposalId: string,
  content: string,
): Promise<{ error?: string }> {
  const trimmed = content?.trim()
  if (!trimmed) return { error: 'Mensaje vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify client owns the request linked to this proposal using user session (RLS-compatible)
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, request_id')
    .eq('id', proposalId)
    .single()
  if (!proposal) return { error: 'No autorizado' }

  const { data: request } = await supabase
    .from('service_requests')
    .select('id')
    .eq('id', proposal.request_id)
    .eq('user_id', user.id)
    .single()
  if (!request) return { error: 'No autorizado' }

  const { error } = await supabase.rpc('insert_message', {
    p_proposal_id: proposalId,
    p_sender_id:   user.id,
    p_content:     trimmed,
  })
  if (error) {
    console.error('sendClientMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
