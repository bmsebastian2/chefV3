'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendProposalEmail } from '@/lib/emails/client-emails'
import { cellFromBudget, proposalPriceRange, proposalSnapshotForTier } from '@/lib/pricing'
import { formatPrice } from '@/lib/format'
import type { MenuPrices } from '@/lib/pricing'

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
  // Snapshot de precios por bracket del menú elegido (null sin menú): la reserva
  // re-precia con estos valores si el cliente cambia los comensales.
  priceSnapshot: MenuPrices | null = null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // ── Menú OBLIGATORIO server-side ───────────────────────────────────────────
  // El form ya deshabilita el botón sin menú elegido, pero la RPC acepta
  // menu_description NULL: sin este guard, un request directo al server action
  // (o a PostgREST) crea propuestas sin menú. El cliente no puede evaluar una
  // propuesta vacía, así que se corta acá.
  const menu = menuDescription?.trim() ?? ''
  if (!menu) return { error: 'La descripción del menú es obligatoria.' }

  // ── Precio AUTORITATIVO server-side ────────────────────────────────────────
  // El cliente propone un precio, pero el servidor decide qué se guarda: cuando
  // el request tiene un tier reconocible (celda de la tabla oficial para sus
  // comensales), el precio DEBE caer dentro de ese rango y el snapshot de
  // re-precio se computa acá desde el tier — no se confía en lo que mande el
  // navegador. Sin tier (requests históricos / datos inconsistentes) se conserva
  // el flujo legacy: precio y snapshot del menú tal como llegan.
  let finalPricePerPerson = pricePerPerson
  let finalSnapshot = priceSnapshot

  const admin = createAdminClient()
  const { data: reqRow } = await admin
    .from('service_requests')
    .select('budget_min, budget_max, guests_adults, guests_teens, guests_kids, cuantas_personas')
    .eq('id', requestId)
    .single()

  if (reqRow) {
    // Misma resolución de comensales que el form (RequestCardItem): cuantas_personas
    // manda; si no, la suma exacta; null → sin info → legacy.
    const guests =
      reqRow.cuantas_personas ??
      (((reqRow.guests_adults ?? 0) + (reqRow.guests_teens ?? 0) + (reqRow.guests_kids ?? 0)) || null)

    if (guests !== null) {
      const cell  = cellFromBudget(reqRow.budget_min, reqRow.budget_max, guests)
      const range = proposalPriceRange(reqRow.budget_min, reqRow.budget_max, guests)
      if (cell && range) {
        const price = Number(pricePerPerson)
        if (!Number.isFinite(price) || price < range.min || price > range.max) {
          return {
            error: `El precio por persona debe estar entre ${formatPrice(range.min)} y ${formatPrice(range.max)}.`,
          }
        }
        finalPricePerPerson = price
        // Snapshot derivado del tier (ignora lo que mande el cliente): re-precia
        // dentro del tier si el cliente cambia los comensales en la reserva.
        finalSnapshot = proposalSnapshotForTier(cell.tier, price, guests)
      }
    }
  }

  const { error } = await supabase.rpc('submit_proposal', {
    p_request_id: requestId,
    p_message: message || null,
    p_menu_description: menu,
    p_price_total: priceTotal,
    p_price_per_person: finalPricePerPerson,
    p_price_2: finalSnapshot?.price_2 ?? null,
    p_price_3_6: finalSnapshot?.price_3_6 ?? null,
    p_price_7_20: finalSnapshot?.price_7_20 ?? null,
  })

  if (error) {
    console.error('submitProposal:', error)
    // El guard de submit_proposal (SECURITY DEFINER) corta a los chefs bloqueados
    // aunque intenten saltarse la UI vía request directo. Lo distinguimos del error
    // genérico para darle un mensaje claro en vez de "intentá de nuevo".
    if (error.message?.includes('chef_blocked')) {
      return { error: 'Tu cuenta está deshabilitada. Contactá a la administración para reactivarla.' }
    }
    // Backstop del rango de precio en la RPC (por si un request directo se saltea
    // la validación de arriba). Mensaje claro en vez del genérico.
    if (error.message?.includes('proposal_price_out_of_range')) {
      return { error: 'El precio propuesto está fuera del rango del presupuesto del cliente.' }
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
