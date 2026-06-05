import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { FotoPerfilUpload } from '@/components/dashboard/FotoPerfilUpload'
import { GaleriaUpload } from '@/components/dashboard/GaleriaUpload'

export default async function FotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: photos } = await supabase
    .from('chef_photos')
    .select('id, url, type')
    .eq('chef_id', chef.id)
    .order('sort_order', { ascending: true })

  const profilePhoto  = photos?.find((p) => p.type === 'profile') ?? null
  const galleryPhotos = photos?.filter((p) => p.type === 'gallery') ?? []

  return (
    <div className="p-6 md:p-10 max-w-2xl">

      {/* ── Header ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Configuración
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Fotos</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Tu foto de perfil y galería de trabajo.
        </p>
      </div>

      {/* ── Foto de perfil ── */}
      <section className="mb-12">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-px w-5 bg-accent/60 rounded-full" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Foto de Perfil
          </h2>
        </div>
        <FotoPerfilUpload
          userId={user.id}
          initialUrl={profilePhoto?.url ?? null}
        />
      </section>

      <div className="border-t border-zinc-100 mb-12" />

      {/* ── Galería ── */}
      <section>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-px w-5 bg-accent/60 rounded-full" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Fotos de Trabajo
          </h2>
        </div>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Mostrá tus platos y eventos. Máximo 12 fotos.
        </p>
        <GaleriaUpload
          userId={user.id}
          initialPhotos={galleryPhotos.map((p) => ({ id: p.id, url: p.url }))}
        />
      </section>
    </div>
  )
}
