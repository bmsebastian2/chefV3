'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function saveNombre(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const first_name     = (formData.get('first_name') as string)?.trim() || ''
  const first_surname  = (formData.get('first_surname') as string)?.trim() || null
  const second_surname = (formData.get('second_surname') as string)?.trim() || null

  if (!first_name) {
    return { error: 'El nombre no puede quedar vacío.' }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ first_name, first_surname, second_surname, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    console.error('saveNombre:', updateError)
    return { error: 'Error al guardar el nombre.' }
  }

  revalidatePath('/client-dashboard')
  revalidatePath('/client-dashboard/configuracion')
  return { success: true }
}
