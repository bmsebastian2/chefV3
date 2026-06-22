import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Datos públicos del mapa de la home, servidos bajo demanda (lazy): el cliente
// solo llama acá cuando el mapa entra en viewport / el usuario pide verlo.
// Antes este RPC corría en el Server Component y viajaba embebido en el HTML
// de toda visita; ahora el initial load no paga ese costo.
//
// Usa el admin client (service-role) server-side — la key nunca toca el browser.
// La función SECURITY DEFINER necesita GRANT EXECUTE a service_role
// (ver create_map_functions.sql).
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_active_chefs_for_map')

  if (error) {
    // Suele indicar que falta correr create_map_functions.sql o el GRANT a service_role.
    console.warn('[chefs-map] no se pudo cargar chefs —', error.message)
    return NextResponse.json({ chefs: [] }, { status: 200 })
  }

  const chefs = Array.isArray(data) ? data : []

  // Cacheamos en el CDN ~5 min (igual frescura que el ISR anterior) sin volver a
  // pegarle a Supabase en cada request; stale-while-revalidate evita esperas.
  return NextResponse.json(
    { chefs },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
