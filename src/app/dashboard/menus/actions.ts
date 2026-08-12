'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { Course } from '@/app/dashboard/platos/actions'
import { MIN_MENUS } from '@/lib/chefRequirements'

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

// Recalcula menus_done en profile_completion a partir del conteo real de
// menús activos. Compartido por saveMenu, deleteMenu y createMenuQuick para
// no repetir el mismo query tres veces.
async function recomputeMenusDone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chefId: string
) {
  const { count } = await supabase
    .from('chef_menus')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .eq('is_active', true)

  await supabase
    .from('profile_completion')
    .update({ menus_done: (count ?? 0) >= MIN_MENUS, updated_at: new Date().toISOString() })
    .eq('chef_id', chefId)
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

  if (chef) await recomputeMenusDone(supabase, chef.id)

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

  if (chef) await recomputeMenusDone(supabase, chef.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/menus')
  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel unificado (platos + menús, drag & drop) — acciones granulares.
// A diferencia de saveMenu (guarda TODO el menú de una), estas comprometen
// un solo cambio a la vez contra las RPCs de menu_dishes, para que soltar o
// tocar un plato se guarde al instante sin esperar a un submit general.
// ─────────────────────────────────────────────────────────────────────────────

export type MenuBuilderData = {
  id:             string
  title:          string
  description:    string
  cuisineTypes:   string[]
  imageUrl:       string | null
  minGuests:      number
  maxGuests:      number
  price2:         number
  price36:        number
  price720:       number
  courseSettings: Record<Course, { selectionMode: SelectionMode; dishIds: string[] }>
}

function mapMenuPriceError(error: { message?: string }): string {
  if (error.message?.includes('menu_price_order')) {
    return 'Los precios por bracket están al revés: a más personas, el precio por persona baja o queda igual, nunca sube.'
  }
  return 'Error al guardar el menú'
}

// Crea un menú con solo el título (el resto queda en los defaults de la
// tabla) — para que el chef pueda empezar a arrastrarle platos de inmediato,
// sin llenar precios/cupos primero.
export async function createMenuQuick(title: string): Promise<{ error?: string; menu?: MenuBuilderData }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const trimmed = title.trim()
  if (!trimmed) return { error: 'El menú necesita un título' }

  const { data, error } = await supabase.rpc('create_menu', {
    p_title: trimmed,
    p_description: null,
    p_cuisine_types: [],
    p_image_url: null,
    p_min_guests: 2,
    p_max_guests: 20,
    p_price_2: 0,
    p_price_3_6: 0,
    p_price_7_20: 0,
  })

  if (error) {
    console.error('createMenuQuick:', error)
    return { error: 'Error al crear el menú' }
  }

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (chef) await recomputeMenusDone(supabase, chef.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/menus')

  return {
    menu: {
      id: data as string,
      title: trimmed,
      description: '',
      cuisineTypes: [],
      imageUrl: null,
      minGuests: 2,
      maxGuests: 20,
      price2: 0,
      price36: 0,
      price720: 0,
      courseSettings: {
        starter:      { selectionMode: 'all_inclusive', dishIds: [] },
        first_course: { selectionMode: 'all_inclusive', dishIds: [] },
        main:         { selectionMode: 'all_inclusive', dishIds: [] },
        dessert:      { selectionMode: 'all_inclusive', dishIds: [] },
      },
    },
  }
}

// Autoguardado de los metadatos del menú (título, descripción, precios, etc.)
// — separado del armado de platos para que un campo de texto no dispare una
// escritura por cada tecla contra menu_dishes.
export async function updateMenuMeta(
  menuId: string,
  input: {
    title: string
    description: string
    cuisineTypes: string[]
    imageUrl: string | null
    minGuests: number
    maxGuests: number
    price2: number
    price36: number
    price720: number
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

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
    console.error('updateMenuMeta:', error)
    return { error: mapMenuPriceError(error) }
  }

  revalidatePath('/dashboard/menus')
  return {}
}

export async function updateCourseSelectionMode(
  menuId: string,
  course: Course,
  mode: SelectionMode
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('set_course_selection_mode', {
    p_menu_id: menuId,
    p_course: course,
    p_selection_mode: mode,
  })

  if (error) {
    console.error('updateCourseSelectionMode:', error)
    return { error: 'Error al guardar la configuración del curso' }
  }

  revalidatePath('/dashboard/menus')
  return {}
}

// Suma un plato al menú — referencia, no lo "consume": el mismo plato puede
// estar en cuantos menús quiera el chef.
export async function addDishToMenu(menuId: string, dishId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('add_dish_to_menu', {
    p_menu_id: menuId,
    p_dish_id: dishId,
  })

  if (error) {
    console.error('addDishToMenu:', error)
    return { error: 'Error al agregar el plato al menú' }
  }

  revalidatePath('/dashboard/menus')
  return {}
}

export async function removeDishFromMenu(menuId: string, dishId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('remove_dish_from_menu', {
    p_menu_id: menuId,
    p_dish_id: dishId,
  })

  if (error) {
    console.error('removeDishFromMenu:', error)
    return { error: 'Error al quitar el plato del menú' }
  }

  revalidatePath('/dashboard/menus')
  return {}
}
