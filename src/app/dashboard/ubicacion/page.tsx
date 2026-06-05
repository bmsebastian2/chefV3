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
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Configuración
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Ubicación</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Tu ciudad y país aparecerán en tu perfil público para que los clientes puedan encontrarte.
        </p>
      </div>
      <UbicacionForm initialData={initialData} />
    </div>
  )
}
