'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { cuisineLabel } from './types'
import type {
  AssistantCuisine,
  ChefResult,
  MatchFilters,
  MatchResult,
} from './types'

// ─── Cocinas disponibles (chips de la pregunta de cocina) ─────────────────────
export async function getAssistantCuisines(): Promise<AssistantCuisine[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_assistant_cuisines')

  if (error) {
    console.error('[assistant] get_assistant_cuisines error:', error)
    return []
  }

  return (data ?? []).map((row: { cuisine: string; chef_count: number }) => ({
    value: row.cuisine,
    label: cuisineLabel(row.cuisine),
    count: Number(row.chef_count) || 0,
  }))
}

// ─── Matching de chefs (con relajación automática vía RPC) ────────────────────
type MatchChefsRow = {
  chef_id: string
  full_name: string | null
  tagline: string | null
  city: string | null
  rating_avg: number | string | null
  total_services: number | null
  photo_url: string | null
  cuisines: string[] | null
  match_level: number
}

export async function matchChefs(filters: MatchFilters): Promise<MatchResult> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('match_chefs', {
    p_service_type: filters.serviceType ?? null,
    p_cuisine:      filters.cuisine ?? null,
    p_guests:       filters.guests ?? null,
  })

  if (error) {
    console.error('[assistant] match_chefs error:', error)
    return { chefs: [], matchLevel: 0, relaxed: false }
  }

  const rows = (data ?? []) as MatchChefsRow[]

  const chefs: ChefResult[] = rows.map((r) => ({
    chefId:        r.chef_id,
    fullName:      r.full_name ?? 'Chef',
    tagline:       r.tagline,
    city:          r.city,
    ratingAvg:     Number(r.rating_avg) || 0,
    totalServices: r.total_services ?? 0,
    photoUrl:      r.photo_url,
    cuisines:      r.cuisines ?? [],
    matchLevel:    r.match_level,
  }))

  const matchLevel = chefs[0]?.matchLevel ?? 0

  return {
    chefs,
    matchLevel,
    relaxed: matchLevel > 0,
  }
}
