'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

const STORAGE_BUCKET = 'chef-photos'
const MAX_GALLERY = 10

function storagePathFromUrl(url: string): string | null {
  const marker = `/${STORAGE_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length).split('?')[0]
}

async function getChefId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

// ── Profile photo ─────────────────────────────────────────────────────────────

export async function saveProfilePhotoUrl(
  url: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const chefId = await getChefId(supabase, user.id)
  if (!chefId) return { error: 'Perfil de chef no encontrado' }

  const { data: existing } = await supabase
    .from('chef_photos')
    .select('url')
    .eq('chef_id', chefId)
    .eq('type', 'profile')
    .maybeSingle()

  if (existing?.url) {
    const oldPath = storagePathFromUrl(existing.url)
    if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath])
  }

  await supabase.from('chef_photos').delete().eq('chef_id', chefId).eq('type', 'profile')

  const { error: insertError } = await supabase
    .from('chef_photos')
    .insert({ chef_id: chefId, url, type: 'profile', sort_order: 0 })

  if (insertError) {
    console.error('saveProfilePhotoUrl:', insertError)
    return { error: 'Error al guardar la foto en la base de datos' }
  }

  await supabase
    .from('profile_completion')
    .update({ profile_picture_done: true, updated_at: new Date().toISOString() })
    .eq('chef_id', chefId)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/fotos')
  return {}
}

// ── Gallery photos ─────────────────────────────────────────────────────────────

export async function addGalleryPhoto(
  url: string
): Promise<{ error?: string; photo?: { id: string; url: string } }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const chefId = await getChefId(supabase, user.id)
  if (!chefId) return { error: 'Perfil de chef no encontrado' }

  const { count } = await supabase
    .from('chef_photos')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .eq('type', 'gallery')

  if ((count ?? 0) >= MAX_GALLERY) {
    return { error: `Máximo ${MAX_GALLERY} fotos de galería permitidas` }
  }

  const { data: newPhoto, error: insertError } = await supabase
    .from('chef_photos')
    .insert({ chef_id: chefId, url, type: 'gallery', sort_order: count ?? 0 })
    .select('id, url')
    .single()

  if (insertError || !newPhoto) {
    console.error('addGalleryPhoto:', insertError)
    return { error: 'Error al guardar la foto' }
  }

  await supabase
    .from('profile_completion')
    .update({ gallery_done: true, updated_at: new Date().toISOString() })
    .eq('chef_id', chefId)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/fotos')
  return { photo: { id: newPhoto.id, url: newPhoto.url } }
}

export async function deleteGalleryPhoto(
  photoId: string,
  url: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const chefId = await getChefId(supabase, user.id)
  if (!chefId) return { error: 'Perfil de chef no encontrado' }

  const { error: deleteError } = await supabase
    .from('chef_photos')
    .delete()
    .eq('id', photoId)
    .eq('chef_id', chefId)
    .eq('type', 'gallery')

  if (deleteError) {
    console.error('deleteGalleryPhoto:', deleteError)
    return { error: 'Error al eliminar la foto' }
  }

  const oldPath = storagePathFromUrl(url)
  if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath])

  // Recalculate gallery_done
  const { count } = await supabase
    .from('chef_photos')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .eq('type', 'gallery')

  await supabase
    .from('profile_completion')
    .update({ gallery_done: (count ?? 0) > 0, updated_at: new Date().toISOString() })
    .eq('chef_id', chefId)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/fotos')
  return {}
}
