import type { createClient } from '@/utils/supabase/server'

// Un menú solo cuenta para los mínimos de activación si tiene al menos un
// plato asignado — un menú con solo título no es una oferta real para el
// cliente. Compartido por dashboard/page.tsx (gate de "Perfil activo") y
// dashboard/menus/actions.ts (profile_completion.menus_done), para que
// checklist, sidebar y el gate real de activación digan siempre lo mismo.
export async function countMenusWithDishes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chefId: string
): Promise<number> {
  const { data: activeMenus } = await supabase
    .from('chef_menus')
    .select('id')
    .eq('chef_id', chefId)
    .eq('is_active', true)

  const activeIds = (activeMenus ?? []).map(m => m.id as string)
  if (activeIds.length === 0) return 0

  const { data: dishRows } = await supabase
    .from('menu_dishes')
    .select('menu_id')
    .in('menu_id', activeIds)

  return new Set((dishRows ?? []).map(r => r.menu_id as string)).size
}
