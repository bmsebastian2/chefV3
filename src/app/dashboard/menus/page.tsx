import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Menús</h1>
      <p className="text-muted-foreground">Aquí podrás gestionar tus menús.</p>
    </div>
  )
}
