'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function saveRequestSettings(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) return { error: 'Perfil de chef no encontrado' }

  const accepts_single   = formData.get('accepts_single') === 'on'
  const accepts_multiple = formData.get('accepts_multiple') === 'on'
  const accepts_weekly   = formData.get('accepts_weekly') === 'on'
  const min_guests       = parseInt(formData.get('min_guests') as string) || 1
  const max_guests       = parseInt(formData.get('max_guests') as string) || 50
  const min_budget       = parseFloat(formData.get('min_budget') as string) || null
  const advance_days     = parseInt(formData.get('advance_days') as string) || 0

  const { error } = await supabase
    .from('request_settings')
    .upsert(
      {
        chef_id: chef.id,
        accepts_single,
        accepts_multiple,
        accepts_weekly,
        min_guests,
        max_guests,
        min_budget,
        advance_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id' }
    )

  if (error) {
    console.error('saveRequestSettings:', error)
    return { error: 'Error al guardar la configuración' }
  }

  await supabase.rpc('mark_request_prefs_done', { p_chef_id: chef.id })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/request-settings')
  revalidatePath('/dashboard/requests')
  return { success: true }
}
