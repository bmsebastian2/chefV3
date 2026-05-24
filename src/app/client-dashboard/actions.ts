'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function cancelRequest(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('service_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/client-dashboard')
  return {}
}
