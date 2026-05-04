import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: userData }, { data: chefProfile }] = await Promise.all([
    supabase.from('users').select('first_name, first_surname, role').eq('id', user.id).single(),
    supabase.from('chef_profiles').select('id').eq('user_id', user.id).single(),
  ])

  // Solo chefs pueden acceder al dashboard de chef
  if (userData?.role !== 'chef') redirect('/client-dashboard')

  let profilePhotoUrl: string | null = null
  if (chefProfile) {
    const { data: photoData } = await supabase
      .from('chef_photos')
      .select('url')
      .eq('chef_id', chefProfile.id)
      .eq('type', 'profile')
      .maybeSingle()
    profilePhotoUrl = photoData?.url ?? null
  }

  const userName = userData?.first_name || user.email || 'Chef'
  const userFullName = [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar userName={userName} userFullName={userFullName} profilePhotoUrl={profilePhotoUrl} />
      <div className="md:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
