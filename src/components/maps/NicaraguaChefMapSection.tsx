import { createAdminClient } from '@/utils/supabase/admin'
import { NicaraguaChefMap, type ChefMarker } from './NicaraguaChefMap'

/**
 * Sección pública de la home: mapa interactivo de Nicaragua con los chefs
 * activos. Server component — hace el fetch vía la RPC SECURITY DEFINER
 * `get_active_chefs_for_map` (evita el problema de RLS al leer chef_profiles
 * con el cliente anónimo) y delega la interactividad al client component.
 *
 * Usa el admin client (sin cookies) en vez del client de sesión: estos datos
 * son públicos y no dependen del usuario, así la home puede renderizarse como
 * estática/ISR en lugar de forzar render dinámico en cada request.
 */
export async function NicaraguaChefMapSection() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_active_chefs_for_map')

  if (error) {
    // Degradamos a lista vacía. Suele indicar que falta correr create_map_functions.sql.
    console.warn('NicaraguaChefMapSection: no se pudo cargar chefs —', error.message)
  }

  const chefs = (Array.isArray(data) ? data : []) as ChefMarker[]

  return (
    <section id="mapa" className="relative bg-background py-24 md:py-28">
      <div className="container mx-auto max-w-[1100px] px-6">
        {/* Encabezado */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            <span className="h-px w-5 bg-emerald-500/70" aria-hidden="true" />
            Cobertura nacional
            <span className="h-px w-5 bg-emerald-500/70" aria-hidden="true" />
          </span>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Chefs activos en todo <span className="text-accent">Nicaragua</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Explorá el mapa por departamento, descubrí quién cocina cerca tuyo y
            abrí el perfil de cada chef disponible en tu zona.
          </p>
        </div>

        {/* Mapa */}
        <NicaraguaChefMap mode="chefs" chefs={chefs} />
      </div>
    </section>
  )
}
