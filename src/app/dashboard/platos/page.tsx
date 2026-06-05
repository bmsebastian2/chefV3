import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PlatosClient } from '@/components/dashboard/PlatosClient'
import type { Dish, Course } from './actions'

export default async function PlatosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: dishRows } = await supabase
    .from('dishes')
    .select('id, name, course')
    .eq('chef_id', chef.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const dishes: Dish[] = (dishRows ?? []).map(d => ({
    id:     d.id as string,
    name:   d.name as string,
    course: d.course as Course,
  }))

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Mi perfil
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Platos</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Los platos que aparecen en tus menús. Organizalos por categoría.
        </p>
      </div>
      <PlatosClient initialDishes={dishes} />
    </div>
  )
}
