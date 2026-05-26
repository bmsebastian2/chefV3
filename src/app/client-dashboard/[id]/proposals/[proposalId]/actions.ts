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
  requestId: string,
  chefId: string,
  content: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('send_message', {
    p_request_id: requestId,
    p_chef_id:    chefId,
    p_content:    content.trim(),
  })
  if (error) {
    console.error('sendClientMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
