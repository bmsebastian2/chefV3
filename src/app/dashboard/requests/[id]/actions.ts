'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

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

  const admin = createAdminClient()

  const { data: userData } = await admin
    .from('users')
    .select('first_name, first_surname, email')
    .eq('id', user.id)
    .single()
  const senderName =
    [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ') ||
    userData?.email ||
    'Chef'

  const { error } = await admin.from('messages').insert({
    proposal_id: proposalId,
    sender_id:   user.id,
    sender_name: senderName,
    content:     trimmed,
  })

  if (error) {
    console.error('sendMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
