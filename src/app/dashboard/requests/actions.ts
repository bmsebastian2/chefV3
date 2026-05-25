'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function submitProposal(
  requestId: string,
  message: string | null,
  menuDescription: string | null,
  priceTotal: number | null,
  pricePerPerson: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('submit_proposal', {
    p_request_id: requestId,
    p_message: message || null,
    p_menu_description: menuDescription || null,
    p_price_total: priceTotal,
    p_price_per_person: pricePerPerson,
  })

  if (error) {
    console.error('submitProposal:', error)
    return { error: 'Error al enviar la propuesta. Intentá de nuevo.' }
  }

  revalidatePath('/dashboard/requests')
  return {}
}
