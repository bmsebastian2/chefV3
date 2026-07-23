'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendProposalEmail } from '@/lib/emails/client-emails'

export type ChefBookingDetail = {
  confirmed_at:            string | null
  completed_at:            string | null
  chef_payout_amount:      number | null
  payout_status:           string | null
  released_at:             string | null
  location:                string | null
  client_phone:            string | null
  proposal_message:        string | null
  proposal_menu:           string | null
  proposal_price_total:    number | null
  proposal_price_person:   number | null
  proposal_sent_at:        string | null
}

export async function getChefBookingDetail(
  bookingId: string,
): Promise<{ data?: ChefBookingDetail; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase.rpc('get_chef_booking_detail', {
    p_booking_id: bookingId,
  })

  if (error) {
    console.error('getChefBookingDetail:', error)
    return { error: 'No se pudo cargar el detalle. Intentá de nuevo.' }
  }

  if (!data) return { error: 'Reserva no encontrada.' }

  return { data: data as ChefBookingDetail }
}

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
    // El guard de submit_proposal (SECURITY DEFINER) corta a los chefs bloqueados
    // aunque intenten saltarse la UI vía request directo. Lo distinguimos del error
    // genérico para darle un mensaje claro en vez de "intentá de nuevo".
    if (error.message?.includes('chef_blocked')) {
      return { error: 'Tu cuenta está deshabilitada. Contactá a la administración para reactivarla.' }
    }
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
