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
    id: d.id as string,
    name: d.name as string,
    course: d.course as Course,
  }))

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Platos</h1>
      <PlatosClient initialDishes={dishes} />
    </div>
  )
}
