import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { BackLink } from './BackLink'
import { ProposalCard } from './ProposalCard'

const SERVICE_LABELS: Record<string, string> = {
  single:   'Servicio único',
  multiple: 'Múltiples servicios',
  weekly:   'Semanal',
}

export default async function ProposalsListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: request } = await supabase
    .from('service_requests')
    .select('id, service_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!request) notFound()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, chef_id, price_per_person, status, created_at')
    .eq('request_id', id)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: true })

  // proposals.chef_id = chef_profiles.id
  const chefProfileIds = (proposals ?? []).map((p) => p.chef_id)

  const [{ data: chefProfiles }, { data: photos }] = await Promise.all([
    chefProfileIds.length > 0
      ? supabase
          .from('chef_profiles')
          .select('id, user_id')
          .in('id', chefProfileIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
    chefProfileIds.length > 0
      ? supabase
          .from('chef_photos')
          .select('chef_id, url')
          .in('chef_id', chefProfileIds)
          .eq('type', 'profile')
      : Promise.resolve({ data: [] as { chef_id: string; url: string }[] }),
  ])

  // Names live in `users` rows that RLS hides from the client user → read via admin
  const admin = createAdminClient()
  const userIds = (chefProfiles ?? []).map((cp) => cp.user_id)
  const { data: users } = userIds.length > 0
    ? await admin.from('users').select('id, first_name, first_surname').in('id', userIds)
    : { data: [] as { id: string; first_name: string | null; first_surname: string | null }[] }

  // chef_profile_id → user_id
  const profileToUser = Object.fromEntries((chefProfiles ?? []).map((cp) => [cp.id, cp.user_id]))
  // user_id → name
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))
  // chef_profile_id → photo url
  const photoMap = Object.fromEntries((photos ?? []).map((p) => [p.chef_id, p.url]))

  return (
    <div className="px-6 pt-16 pb-10 max-w-2xl">
        {/* Back */}
        <BackLink href="/client-dashboard" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold text-zinc-900">
            Propuestas recibidas
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {SERVICE_LABELS[request.service_type] ?? request.service_type}
            {proposals && proposals.length > 0 && (
              <span className="ml-2 text-zinc-400">· {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        {/* List */}
        {proposals && proposals.length > 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
            {proposals.map((proposal) => {
              const userId = profileToUser[proposal.chef_id]
              const userData = userId ? userMap[userId] : null
              const photoUrl = photoMap[proposal.chef_id] ?? null
              const chefName = userData
                ? [userData.first_name, userData.first_surname].filter(Boolean).join(' ')
                : 'Chef'

              return (
                <ProposalCard
                  key={proposal.id}
                  href={`/client-dashboard/${id}/proposals/${proposal.id}`}
                  photoUrl={photoUrl}
                  chefName={chefName}
                  priceText={
                    proposal.price_per_person
                      ? `$${Number(proposal.price_per_person).toLocaleString('es-AR')} / persona`
                      : 'Precio a consultar'
                  }
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
            <p className="text-sm text-zinc-500">No hay propuestas para esta solicitud.</p>
          </div>
        )}
    </div>
  )
}
