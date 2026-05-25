'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type Course = 'starter' | 'first_course' | 'main' | 'dessert'

export type Dish = {
  id: string
  name: string
  course: Course
  description?: string | null
}

export async function addDish(
  name: string,
  course: Course,
  description?: string
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase.rpc('add_dish', {
    p_name: name.trim(),
    p_course: course,
    p_description: description?.trim() || null,
  })

  if (error) {
    console.error('addDish:', error)
    return { error: 'Error al agregar el plato' }
  }

  revalidatePath('/dashboard/platos')
  return { id: data as string }
}

export async function updateDish(
  dishId: string,
  name: string,
  course: Course,
  description?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('update_dish', {
    p_dish_id: dishId,
    p_name: name.trim(),
    p_course: course,
    p_description: description?.trim() || null,
  })

  if (error) {
    console.error('updateDish:', error)
    return { error: 'Error al actualizar el plato' }
  }

  revalidatePath('/dashboard/platos')
  return {}
}

export async function deleteDish(
  dishId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('delete_dish', {
    p_dish_id: dishId,
  })

  if (error) {
    console.error('deleteDish:', error)
    return { error: 'Error al eliminar el plato' }
  }

  revalidatePath('/dashboard/platos')
  return {}
}
