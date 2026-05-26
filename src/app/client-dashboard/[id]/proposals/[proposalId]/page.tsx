export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { ProposalDetailView } from './ProposalDetailView'

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>
}) {
  const { id: requestId, proposalId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Verify the request belongs to the authenticated client
  const { data: request } = await supabase
    .from('service_requests')
    .select('id, service_type, event_date_start, event_date_end, event_time')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!request) notFound()

  // Fetch the specific proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, chef_id, message, menu_description, price_per_person, status, created_at')
    .eq('id', proposalId)
    .eq('request_id', requestId)
    .single()
  if (!proposal || proposal.status === 'withdrawn') notFound()

  // Other proposals for the sidebar (excluding this one and withdrawn)
  const { data: otherProposalsRaw } = await supabase
    .from('proposals')
    .select('id, chef_id, price_per_person')
    .eq('request_id', requestId)
    .neq('id', proposalId)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: true })

  const allChefIds = [
    proposal.chef_id as string,
    ...(otherProposalsRaw ?? []).map((p) => p.chef_id as string),
  ]

  const admin = createAdminClient()

  // Parallel: chef profiles, all photos, messages, meal date
  const [
    { data: chefProfiles },
    { data: allPhotos },
    { data: messages },
    { data: mealDate },
  ] = await Promise.all([
    supabase
      .from('chef_profiles')
      .select('id, user_id, tagline, acerca_de_mi, experience_years')
      .in('id', allChefIds),
    supabase
      .from('chef_photos')
      .select('id, chef_id, url, type')
      .in('chef_id', allChefIds),
    supabase
      .from('messages')
      .select('id, sender_id, sender_name, content, is_read, sent_at')
      .eq('proposal_id', proposalId)
      .order('sent_at', { ascending: true }),
    supabase
      .from('request_dates')
      .select('desayuno, almuerzo, cena')
      .eq('request_id', requestId)
      .eq('fecha', request.event_date_start)
      .maybeSingle(),
  ])

  // Fetch names via admin to bypass RLS (chef rows not readable by client user)
  const userIds = (chefProfiles ?? []).map((cp) => cp.user_id as string)
  const { data: chefUsers } = userIds.length > 0
    ? await admin
        .from('users')
        .select('id, first_name, first_surname')
        .in('id', userIds)
    : { data: [] as { id: string; first_name: string | null; first_surname: string | null }[] }

  // Build lookup maps
  const profileMap = Object.fromEntries(
    (chefProfiles ?? []).map((cp) => [cp.id as string, cp])
  )
  const userMap = Object.fromEntries(
    (chefUsers ?? []).map((u) => [u.id, u])
  )
  const profilePhotoMap = Object.fromEntries(
    (allPhotos ?? [])
      .filter((p) => p.type === 'profile')
      .map((p) => [p.chef_id as string, p.url as string])
  )

  const getChefName = (chefProfileId: string) => {
    const profile = profileMap[chefProfileId]
    if (!profile) return 'Chef'
    const u = userMap[profile.user_id as string]
    return u ? [u.first_name, u.first_surname].filter(Boolean).join(' ') : 'Chef'
  }

  const mainProfile = profileMap[proposal.chef_id as string]

  const galleryPhotos = (allPhotos ?? [])
    .filter((p) => p.type === 'gallery' && p.chef_id === proposal.chef_id)
    .map((p) => ({ id: p.id as string, url: p.url as string }))

  let mealLabel: string | null = null
  if (mealDate) {
    if (mealDate.cena)     mealLabel = 'Cena'
    else if (mealDate.almuerzo) mealLabel = 'Almuerzo'
    else if (mealDate.desayuno) mealLabel = 'Desayuno'
  }

  return (
    <ProposalDetailView
      requestId={requestId}
      currentUserId={user.id}
      proposal={{
        id:               proposal.id as string,
        message:          proposal.message as string | null,
        menu_description: proposal.menu_description as string | null,
        price_per_person: proposal.price_per_person as number | null,
        status:           proposal.status as string,
        created_at:       proposal.created_at as string,
      }}
      chef={{
        name:             getChefName(proposal.chef_id as string),
        photoUrl:         profilePhotoMap[proposal.chef_id as string] ?? null,
        tagline:          (mainProfile?.tagline as string | null) ?? null,
        acerca_de_mi:     (mainProfile?.acerca_de_mi as string | null) ?? null,
        experience_years: (mainProfile?.experience_years as number | null) ?? null,
        galleryPhotos,
      }}
      request={{
        event_date_start: request.event_date_start as string,
        event_date_end:   request.event_date_end as string | null,
        event_time:       request.event_time as string | null,
        service_type:     request.service_type as string,
        meal_label:       mealLabel,
        dateStr: new Date((request.event_date_start as string) + "T00:00:00").toLocaleDateString("es-AR", {
          day: "numeric", month: "short", year: "numeric",
        }),
      }}
      otherProposals={(otherProposalsRaw ?? []).map((op) => ({
        id:               op.id as string,
        chefName:         getChefName(op.chef_id as string),
        photoUrl:         profilePhotoMap[op.chef_id as string] ?? null,
        price_per_person: op.price_per_person as number | null,
      }))}
      initialMessages={(messages ?? []).map((m) => ({
        id:          m.id as string,
        sender_id:   m.sender_id as string,
        sender_name: m.sender_name as string,
        content:     m.content as string,
        is_read:     m.is_read as boolean,
        sent_at:     m.sent_at as string,
      }))}
    />
  )
}
