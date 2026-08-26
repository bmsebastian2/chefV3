'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { checkMessageContent, MODERATION_BLOCKED_MESSAGE } from '@/lib/chat-moderation'
import { notifyClientOfNewMessage } from '@/lib/emails/client-emails'

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

  const moderation = checkMessageContent(trimmed)
  if (moderation.blocked) {
    const admin = createAdminClient()
    await admin.from('chat_moderation_flags').insert({
      proposal_id:      proposalId,
      sender_id:        user.id,
      sender_role:      'chef',
      content:          trimmed,
      matched_category: moderation.category,
    })
    return { error: MODERATION_BLOCKED_MESSAGE }
  }

  const { error } = await supabase.rpc('insert_message', {
    p_proposal_id: proposalId,
    p_sender_id:   user.id,
    p_content:     trimmed,
  })

  if (error) {
    console.error('sendMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  const admin = createAdminClient()
  const { data: chefUser } = await admin
    .from('users')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle()
  const chefName = chefUser?.first_name || 'Tu chef'

  notifyClientOfNewMessage(proposalId, chefName).catch((err) =>
    console.error('sendMessage: notifyClientOfNewMessage falló', err)
  )

  return {}
}

export async function markConversationRead(proposalId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.rpc('mark_conversation_read', { p_proposal_id: proposalId })
  if (error) console.error('markConversationRead:', error)
}
