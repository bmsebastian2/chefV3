'use server'

import { createClient } from '@/utils/supabase/server'

export async function sendMessage(
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
    console.error('sendMessage:', error)
    return { error: 'Error al enviar el mensaje' }
  }

  return {}
}
