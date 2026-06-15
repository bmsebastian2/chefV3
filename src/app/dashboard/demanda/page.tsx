export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { NicaraguaChefMap, type DemandRow } from '@/components/maps/NicaraguaChefMap'

export default async function DemandaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data, error } = await supabase.rpc('get_demand_by_city')
  if (error) {
    // Degradamos a vacío. Suele indicar que falta correr create_map_functions.sql.
    console.warn('DemandaPage: no se pudo cargar demanda —', error.message)
  }
  const demand = (Array.isArray(data) ? data : []) as DemandRow[]
  const total = demand.reduce((sum, row) => sum + row.demand, 0)

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Inteligencia de mercado
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">
          Demanda por departamento
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Dónde están pidiendo chef ahora mismo. Intensidad según solicitudes
          activas{total > 0 && <> · {total} en total</>}.
        </p>
      </div>

      <NicaraguaChefMap mode="demand" demand={demand} />
    </div>
  )
}
