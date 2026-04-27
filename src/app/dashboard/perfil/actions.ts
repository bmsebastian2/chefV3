'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

const LANGUAGE_CODES = ['es', 'en', 'fr', 'de', 'pt', 'it']

export async function savePerfilProfesional(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: chefProfile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chefProfile) return { error: 'Perfil de chef no encontrado' }

  const str = (key: string) => (formData.get(key) as string)?.trim() || null

  const tagline           = str('tagline')
  const acerca_de_mi      = str('acerca_de_mi')
  const para_mi_cocinar_es = str('para_mi_cocinar_es')
  const aprendi_a_cocinar = str('aprendi_a_cocinar')
  const mi_secreto_cocina = str('mi_secreto_cocina')
  const sitio_web         = str('sitio_web')
  const instagram         = str('instagram')
  const facebook          = str('facebook')
  const youtube           = str('youtube')
  const linkedin          = str('linkedin')
  const expRaw            = formData.get('experience_years') as string
  const experience_years  = expRaw ? parseInt(expRaw, 10) : null

  const { error: updateError } = await supabase
    .from('chef_profiles')
    .update({
      tagline,
      acerca_de_mi,
      para_mi_cocinar_es,
      aprendi_a_cocinar,
      mi_secreto_cocina,
      experience_years,
      sitio_web,
      instagram,
      facebook,
      youtube,
      linkedin,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chefProfile.id)

  if (updateError) {
    console.error('savePerfilProfesional:', updateError)
    return { error: 'Error al guardar el perfil' }
  }

  // Replace languages
  const selected = LANGUAGE_CODES.filter((code) => formData.get(`lang_${code}`) === 'on')
  await supabase.from('chef_languages').delete().eq('chef_id', chefProfile.id)
  if (selected.length > 0) {
    await supabase.from('chef_languages').insert(
      selected.map((language_code) => ({ chef_id: chefProfile.id, language_code }))
    )
  }

  // Mark bio_done if at least tagline or acerca_de_mi is filled
  await supabase
    .from('profile_completion')
    .update({ bio_done: !!(tagline || acerca_de_mi), updated_at: new Date().toISOString() })
    .eq('chef_id', chefProfile.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/perfil')
  return { success: true }
}
