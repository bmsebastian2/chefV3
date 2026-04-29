import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RequestSettingsForm } from '@/components/dashboard/RequestSettingsForm'
import type { RequestSettingsInitialData } from '@/components/dashboard/RequestSettingsForm'

export default async function RequestSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: settings } = await supabase
    .from('request_settings')
    .select('*')
    .eq('chef_id', chef.id)
    .single()

  const initialData: RequestSettingsInitialData = {
    accepts_single:   settings?.accepts_single   ?? true,
    accepts_multiple: settings?.accepts_multiple ?? true,
    accepts_weekly:   settings?.accepts_weekly   ?? true,
    min_guests:       settings?.min_guests        ?? 1,
    max_guests:       settings?.max_guests        ?? 50,
    min_budget:       settings?.min_budget        ?? null,
    advance_days:     settings?.advance_days      ?? 3,
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Configuración de Solicitudes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Filtrá qué solicitudes querés ver según tus preferencias de trabajo.
        </p>
      </div>
      <RequestSettingsForm initialData={initialData} />
    </div>
  )
}
