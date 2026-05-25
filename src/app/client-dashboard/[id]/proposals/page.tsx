import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BackLink } from './BackLink'

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

  const userIds = (chefProfiles ?? []).map((cp) => cp.user_id)
  const { data: users } = userIds.length > 0
    ? await supabase.from('users').select('id, first_name, first_surname').in('id', userIds)
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
                <Link
                  key={proposal.id}
                  href={`/client-dashboard/${id}/proposals/${proposal.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0 ring-1 ring-zinc-200">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={chefName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-base font-semibold">
                        {chefName[0]?.toUpperCase() ?? 'C'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">{chefName}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {proposal.price_per_person
                        ? `$${Number(proposal.price_per_person).toLocaleString('es-AR')} / persona`
                        : 'Precio a consultar'}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-0.5 text-sm text-accent font-medium flex-shrink-0">
                    Ver propuesta
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
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
