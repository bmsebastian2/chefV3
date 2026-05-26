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

  const admin = createAdminClient()

  const { data: userData } = await admin
    .from('users')
    .select('first_name, first_surname, email')
    .eq('id', user.id)
    .single()
  const senderName =
    [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ') ||
    userData?.email ||
    'Cliente'

  const { error } = await admin.from('messages').insert({
    proposal_id: proposalId,
    sender_id:   user.id,
    sender_name: senderName,
    content:     trimmed,
  })
  if (error) {
    console.error('sendClientMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
