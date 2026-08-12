import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { MenuBuilderPanel } from '@/components/dashboard/MenuBuilderPanel'
import type { Dish, Course } from '@/app/dashboard/platos/actions'
import type { MenuBuilderData, SelectionMode } from '@/app/dashboard/menus/actions'

export default async function MenusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  // menu_course_settings y menu_dishes no filtran por chef_id acá: sus
  // políticas RLS ya restringen la lectura a los menús del chef logueado
  // (menu_id IN (... WHERE chef_id IN (... auth.uid()))).
  const [
    { data: dishRows },
    { data: menuRows },
    { data: courseRows },
    { data: dishRows2 },
    { data: platformConfig },
  ] = await Promise.all([
    supabase
      .from('dishes')
      .select('id, name, course, description')
      .eq('chef_id', chef.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('chef_menus')
      .select('id, title, description, cuisine_types, image_url, min_guests, max_guests, price_2, price_3_6, price_7_20')
      .eq('chef_id', chef.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('menu_course_settings')
      .select('menu_id, course, selection_mode'),
    supabase
      .from('menu_dishes')
      .select('menu_id, dish_id'),
    supabase
      .from('platform_config')
      .select('commission_rate')
      .eq('id', 1)
      .single(),
  ])

  const dishes: Dish[] = (dishRows ?? []).map(d => ({
    id: d.id as string,
    name: d.name as string,
    course: d.course as Course,
    description: d.description as string | null,
  }))

  const emptyCourseSettings = (): Record<Course, { selectionMode: SelectionMode; dishIds: string[] }> => ({
    starter:      { selectionMode: 'all_inclusive', dishIds: [] },
    first_course: { selectionMode: 'all_inclusive', dishIds: [] },
    main:         { selectionMode: 'all_inclusive', dishIds: [] },
    dessert:      { selectionMode: 'all_inclusive', dishIds: [] },
  })

  const menus: MenuBuilderData[] = (menuRows ?? []).map(m => {
    const courseSettings = emptyCourseSettings()

    ;(courseRows ?? [])
      .filter(c => c.menu_id === m.id)
      .forEach(c => {
        courseSettings[c.course as Course].selectionMode = c.selection_mode as SelectionMode
      })
    ;(dishRows2 ?? [])
      .filter(row => row.menu_id === m.id)
      .forEach(row => {
        const dish = dishes.find(d => d.id === row.dish_id)
        if (dish) courseSettings[dish.course].dishIds.push(dish.id)
      })

    return {
      id: m.id as string,
      title: m.title as string,
      description: (m.description as string) ?? '',
      cuisineTypes: (m.cuisine_types as string[]) ?? [],
      imageUrl: m.image_url as string | null,
      minGuests: m.min_guests as number,
      maxGuests: m.max_guests as number,
      price2: m.price_2 as number,
      price36: m.price_3_6 as number,
      price720: m.price_7_20 as number,
      courseSettings,
    }
  })

  const dishUsageCounts: Record<string, number> = {}
  ;(dishRows2 ?? []).forEach(row => {
    dishUsageCounts[row.dish_id as string] = (dishUsageCounts[row.dish_id as string] ?? 0) + 1
  })

  const commissionRatePercent = Number((((platformConfig?.commission_rate as number) ?? 0.15) * 100).toFixed(2))

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 max-w-2xl">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Mi perfil
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Tu Carta</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Armá tus platos a la izquierda y arrastralos (o tocá el botón ＋) a la sección del menú que estés armando a la derecha.
        </p>
      </div>
      <MenuBuilderPanel
        initialDishes={dishes}
        initialMenus={menus}
        initialDishUsage={dishUsageCounts}
        userId={user.id}
        commissionRatePercent={commissionRatePercent}
      />
    </div>
  )
}
