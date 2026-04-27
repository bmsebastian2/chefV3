import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UbicacionForm } from '@/components/dashboard/UbicacionForm'
import type { UbicacionInitialData } from '@/components/dashboard/UbicacionForm'

export default async function UbicacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('city, country, preferred_language')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const initialData: UbicacionInitialData = {
    city:               chef.city,
    country:            chef.country,
    preferred_language: chef.preferred_language,
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Ubicación</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu ciudad y país aparecerán en tu perfil público para que los clientes puedan encontrarte.
        </p>
      </div>
      <UbicacionForm initialData={initialData} />
    </div>
  )
}
