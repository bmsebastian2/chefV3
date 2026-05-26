'use server'

import { createClient } from '@/utils/supabase/server'

export async function sendMessage(
  proposalId: string,
  content: string,
): Promise<{ error?: string }> {
  const trimmed = content?.trim()
  if (!trimmed) return { error: 'Mensaje vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify chef owns this proposal using user session (RLS-compatible)
  const { data: chefProfile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!chefProfile) return { error: 'No autorizado' }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('chef_id', chefProfile.id)
    .single()
  if (!proposal) return { error: 'No autorizado' }

  const { error } = await supabase.rpc('insert_message', {
    p_proposal_id: proposalId,
    p_sender_id:   user.id,
    p_content:     trimmed,
  })

  if (error) {
    console.error('sendMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
