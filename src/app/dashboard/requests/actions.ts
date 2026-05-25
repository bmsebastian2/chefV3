'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendProposalEmail } from '@/lib/emails/client-emails'

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

  after(() =>
    notifyClientOfProposal(requestId, user.id).catch((err) =>
      console.error('[submitProposal] email notification failed:', err)
    )
  )

  return {}
}

async function notifyClientOfProposal(requestId: string, chefUserId: string): Promise<void> {
  const admin = createAdminClient()

  const [requestResult, chefResult] = await Promise.all([
    admin
      .from('service_requests')
      .select('event_date_start, event_time, user_id')
      .eq('id', requestId)
      .single(),
    admin
      .from('users')
      .select('first_name, first_surname')
      .eq('id', chefUserId)
      .single(),
  ])

  if (requestResult.error || !requestResult.data) {
    console.error('[notifyClientOfProposal] request fetch failed:', requestResult.error)
    return
  }
  if (chefResult.error || !chefResult.data) {
    console.error('[notifyClientOfProposal] chef fetch failed:', chefResult.error)
    return
  }

  const req  = requestResult.data
  const chef = chefResult.data

  const clientResult = await admin
    .from('users')
    .select('email, first_name, first_surname')
    .eq('id', req.user_id)
    .single()

  if (clientResult.error || !clientResult.data) {
    console.error('[notifyClientOfProposal] client user fetch failed:', clientResult.error)
    return
  }

  const client     = clientResult.data
  const chefName   = [chef.first_name, chef.first_surname].filter(Boolean).join(' ')
  const clientName = [client.first_name, client.first_surname].filter(Boolean).join(' ')

  if (!client.email) {
    console.error('[notifyClientOfProposal] client has no email, request', requestId)
    return
  }

  await sendProposalEmail({
    clientEmail: client.email as string,
    clientName,
    chefName,
    mealTime:  req.event_time       ?? null,
    eventDate: req.event_date_start ?? null,
    requestId,
  })
}
