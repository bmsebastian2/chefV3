import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, UtensilsCrossed } from 'lucide-react'
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

  // Tasa vigente de comisión (ver MIGRATION_commission_rate_config.sql) — solo
  // para el preview "cuánto te queda" de la tabla de precios.
  const { data: platformConfig } = await supabase
    .from('platform_config')
    .select('commission_rate')
    .eq('id', 1)
    .single()
  const commissionRatePercent = Number((((platformConfig?.commission_rate as number) ?? 0.15) * 100).toFixed(2))

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

  if (id === 'nuevo' && availableDishes.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-2xl">
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UtensilsCrossed className="text-zinc-300" size={28} />
          </div>
          <h3 className="font-serif text-lg font-semibold text-zinc-800 mb-2">
            Creá tus platos primero
          </h3>
          <p className="text-sm text-zinc-400 mb-7 max-w-xs mx-auto leading-relaxed">
            Un menú se arma combinando tus platos. Cargá al menos uno antes de crear tu primer menú.
          </p>
          <Link
            href="/dashboard/platos"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
          >
            <Plus size={15} />
            Crear mis platos
          </Link>
        </div>
      </div>
    )
  }

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
      commissionRatePercent={commissionRatePercent}
    />
  )
}
