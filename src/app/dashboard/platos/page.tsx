import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Platos</h1>
      <p className="text-muted-foreground">Aquí podrás gestionar tus platos.</p>
    </div>
  )
}
