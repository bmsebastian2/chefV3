import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { MenuEditorClient } from '@/components/dashboard/MenuEditorClient'
import type { Course } from '@/app/dashboard/platos/actions'
import type { SelectionMode, MenuEditData } from '@/app/dashboard/menus/actions'

export default async function MenuEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, course')
    .eq('chef_id', chef.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const availableDishes = (dishes ?? []).map(d => ({
    id: d.id as string,
    name: d.name as string,
    course: d.course as Course,
  }))

  let initialData: MenuEditData | undefined

  if (id !== 'nuevo') {
    const { data: menu } = await supabase
      .from('chef_menus')
      .select('id, title, description, cuisine_types, image_url, min_guests, max_guests, price_2, price_3_6, price_7_20')
      .eq('id', id)
      .eq('chef_id', chef.id)
      .single()

    if (!menu) redirect('/dashboard/menus')

    const { data: courseRows } = await supabase
      .from('menu_course_settings')
      .select('course, selection_mode')
      .eq('menu_id', id)

    const { data: dishRows } = await supabase
      .from('menu_dishes')
      .select('dish_id, dishes(course)')
      .eq('menu_id', id)

    const defaultMode: SelectionMode = 'all_inclusive'
    const courseMap = Object.fromEntries(
      (courseRows ?? []).map(r => [r.course, r.selection_mode as SelectionMode])
    )

    const dishesByCourse: Record<Course, string[]> = {
      starter: [], first_course: [], main: [], dessert: [],
    }
    ;(dishRows ?? []).forEach((row) => {
      const dishes = row.dishes
      const course = Array.isArray(dishes) ? dishes[0]?.course : (dishes as { course: string } | null)?.course
      const c = course as Course
      if (c && dishesByCourse[c]) dishesByCourse[c].push(row.dish_id)
    })

    initialData = {
      id: menu.id as string,
      title: menu.title as string,
      description: (menu.description as string) ?? '',
      cuisine_types: (menu.cuisine_types as string[]) ?? [],
      image_url: menu.image_url as string | null,
      min_guests: menu.min_guests as number,
      max_guests: menu.max_guests as number,
      price_2: menu.price_2 as number,
      price_3_6: menu.price_3_6 as number,
      price_7_20: menu.price_7_20 as number,
      courseSettings: {
        starter: { selectionMode: courseMap['starter'] ?? defaultMode, dishIds: dishesByCourse.starter },
        first_course: { selectionMode: courseMap['first_course'] ?? defaultMode, dishIds: dishesByCourse.first_course },
        main: { selectionMode: courseMap['main'] ?? defaultMode, dishIds: dishesByCourse.main },
        dessert: { selectionMode: courseMap['dessert'] ?? defaultMode, dishIds: dishesByCourse.dessert },
      },
    }
  }

  return (
    <MenuEditorClient
      menuId={id === 'nuevo' ? null : id}
      availableDishes={availableDishes}
      initialData={initialData}
      userId={user.id}
    />
  )
}
