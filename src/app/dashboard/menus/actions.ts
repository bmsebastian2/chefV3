'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Course } from '@/app/dashboard/platos/actions'

export type SelectionMode = 'all_inclusive' | 'choose_1' | 'choose_2' | 'choose_3'

export type CourseSetting = {
  course: Course
  selectionMode: SelectionMode
  dishIds: string[]
}

export type SaveMenuInput = {
  menuId: string | null
  title: string
  description: string
  cuisineTypes: string[]
  imageUrl: string | null
  minGuests: number
  maxGuests: number
  price2: number
  price36: number
  price720: number
  courseData: CourseSetting[]
}

export type MenuListItem = {
  id: string
  title: string
  cuisine_types: string[]
  image_url: string | null
}

export type MenuEditData = {
  id: string
  title: string
  description: string
  cuisine_types: string[]
  image_url: string | null
  min_guests: number
  max_guests: number
  price_2: number
  price_3_6: number
  price_7_20: number
  courseSettings: Record<Course, { selectionMode: SelectionMode; dishIds: string[] }>
}

export async function saveMenu(input: SaveMenuInput): Promise<{ error?: string; menuId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  let menuId: string

  if (!input.menuId) {
    const { data, error } = await supabase.rpc('create_menu', {
      p_title: input.title,
      p_description: input.description || null,
      p_cuisine_types: input.cuisineTypes,
      p_image_url: input.imageUrl || null,
      p_min_guests: input.minGuests,
      p_max_guests: input.maxGuests,
      p_price_2: input.price2,
      p_price_3_6: input.price36,
      p_price_7_20: input.price720,
    })
    if (error) {
      console.error('create_menu:', error)
      if (error.message?.includes('menu_price_order')) {
        return { error: 'Los precios por bracket están al revés: a más personas, el precio por persona baja o queda igual, nunca sube.' }
      }
      return { error: 'Error al crear el menú' }
    }
    menuId = data as string
  } else {
    menuId = input.menuId
    const { error } = await supabase.rpc('update_menu', {
      p_menu_id: menuId,
      p_title: input.title,
      p_description: input.description || null,
      p_cuisine_types: input.cuisineTypes,
      p_image_url: input.imageUrl || null,
      p_min_guests: input.minGuests,
      p_max_guests: input.maxGuests,
      p_price_2: input.price2,
      p_price_3_6: input.price36,
      p_price_7_20: input.price720,
    })
    if (error) {
      console.error('update_menu:', error)
      if (error.message?.includes('menu_price_order')) {
        return { error: 'Los precios por bracket están al revés: a más personas, el precio por persona baja o queda igual, nunca sube.' }
      }
      return { error: 'Error al actualizar el menú' }
    }
  }

  for (const cs of input.courseData) {
    const { error } = await supabase.rpc('set_course_selection_mode', {
      p_menu_id: menuId,
      p_course: cs.course,
      p_selection_mode: cs.selectionMode,
    })
    if (error) { console.error('set_course_selection_mode:', error); return { error: 'Error al guardar configuración de cursos' } }
  }

  const allDishIds = input.courseData.flatMap(cs => cs.dishIds)
  const { error: dishError } = await supabase.rpc('sync_menu_dishes', {
    p_menu_id: menuId,
    p_dish_ids: allDishIds.length > 0 ? allDishIds : [],
  })
  if (dishError) { console.error('sync_menu_dishes:', dishError); return { error: 'Error al guardar platos del menú' } }

  // Mark menus_done in profile_completion
  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (chef) {
    await supabase
      .from('profile_completion')
      .update({ menus_done: true, updated_at: new Date().toISOString() })
      .eq('chef_id', chef.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/menus')
  return { menuId }
}

export async function deleteMenu(menuId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('delete_menu', { p_menu_id: menuId })
  if (error) { console.error('delete_menu:', error); return { error: 'Error al eliminar el menú' } }

  // Recalculate menus_done based on remaining menus
  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (chef) {
    const { count } = await supabase
      .from('chef_menus')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', chef.id)
      .eq('is_active', true)

    await supabase
      .from('profile_completion')
      .update({ menus_done: (count ?? 0) > 0, updated_at: new Date().toISOString() })
      .eq('chef_id', chef.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/menus')
  return {}
}
