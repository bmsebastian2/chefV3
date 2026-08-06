'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { validatePassword } from '@/lib/password'
import {
  REQUEST_SELECT,
  REQUEST_STATUS_GROUPS,
  REQUESTS_PAGE_SIZE,
  type ClientRequest,
  type RequestGroup,
  type RequestsPayload,
} from './requests'

// Cuenta de propuestas (sin retiradas) por solicitud, para el footer de la tarjeta.
async function fetchProposalCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  if (requestIds.length === 0) return counts

  const { data: proposals } = await supabase
    .from('proposals')
    .select('request_id, status')
    .in('request_id', requestIds)
    .neq('status', 'withdrawn')

  for (const p of proposals ?? []) {
    counts[p.request_id] = (counts[p.request_id] ?? 0) + 1
  }
  return counts
}

/**
 * Trae las solicitudes del cliente de un grupo de estado, filtrando por
 * `status IN (...)` directamente en Supabase (no en el cliente) y acotando a
 * REQUESTS_PAGE_SIZE. Corre como el usuario autenticado → respeta RLS.
 * Usada de forma lazy por las pestañas Completadas / Canceladas.
 */
export async function fetchClientRequests(
  group: RequestGroup,
): Promise<RequestsPayload & { error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requests: [], proposalCounts: {}, error: 'No autenticado' }

  const { data: requests, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .eq('user_id', user.id)
    .in('status', REQUEST_STATUS_GROUPS[group] as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(REQUESTS_PAGE_SIZE)

  if (error) return { requests: [], proposalCounts: {}, error: error.message }

  const list = (requests ?? []) as unknown as ClientRequest[]
  const proposalCounts = await fetchProposalCounts(supabase, list.map((r) => r.id))
  return { requests: list, proposalCounts }
}

export async function cancelRequest(requestId: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('service_requests')
    .update({
      status: 'cancelled',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/client-dashboard')
  return {}
}

/**
 * Prompt de primer ingreso (ver PasswordSetupPrompt): el cliente elige crear
 * su propia contraseña en vez de seguir dependiendo del magic link.
 */
export async function setInitialPassword(
  prevState: { error: string; success: boolean } | null,
  formData: FormData,
): Promise<{ error: string; success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', success: false }

  const newPassword = formData.get('newPassword') as string
  const repeatPassword = formData.get('repeatPassword') as string

  const { valid, message } = validatePassword(newPassword || '')
  if (!valid) return { error: message, success: false }
  if (newPassword !== repeatPassword) {
    return { error: 'Las contraseñas no coinciden.', success: false }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return { error: updateError.message, success: false }

  const { error: rpcError } = await supabase.rpc('mark_password_set')
  if (rpcError) console.error('Error marking password_set:', rpcError)

  revalidatePath('/client-dashboard')
  return { error: '', success: true }
}

/**
 * Prompt de primer ingreso: el cliente elige seguir entrando solo por
 * magic link. No cambia ninguna contraseña, solo apaga el prompt.
 */
export async function skipPasswordSetup(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('mark_password_set')
  if (error) return { error: error.message }

  revalidatePath('/client-dashboard')
  return {}
}
