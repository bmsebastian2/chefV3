'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function saveUbicacion(
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

  const city               = (formData.get('city') as string)?.trim() || null
  const country            = (formData.get('country') as string)?.trim() || null
  const preferred_language = (formData.get('preferred_language') as string)?.trim() || 'es'

  // Nota: las ciudades adicionales (additional_cities) se editan en
  // Config. Solicitudes (request-settings), no acá. No se tocan en este save.
  const { error: updateError } = await supabase
    .from('chef_profiles')
    .update({ city, country, preferred_language, updated_at: new Date().toISOString() })
    .eq('id', chef.id)

  if (updateError) {
    console.error('saveUbicacion:', updateError)
    return { error: 'Error al guardar la ubicación' }
  }

  await supabase
    .from('profile_completion')
    .update({
      location_done: !!(city && country),
      updated_at: new Date().toISOString(),
    })
    .eq('chef_id', chef.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ubicacion')
  return { success: true }
}
