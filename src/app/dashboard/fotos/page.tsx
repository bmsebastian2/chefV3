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

  const profilePhoto = photos?.find((p) => p.type === 'profile') ?? null
  const galleryPhotos = photos?.filter((p) => p.type === 'gallery') ?? []

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-10">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Fotos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu foto de perfil y galería de trabajo
        </p>
      </div>

      {/* Foto de perfil */}
      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
          Foto de Perfil
        </h2>
        <FotoPerfilUpload
          userId={user.id}
          initialUrl={profilePhoto?.url ?? null}
        />
      </section>

      <hr className="border-zinc-100 mb-12" />

      {/* Galería */}
      <section>
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Fotos de Trabajo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Muestra tus platos y eventos. Máximo 10 fotos.
          </p>
        </div>
        <GaleriaUpload
          userId={user.id}
          initialPhotos={galleryPhotos.map((p) => ({ id: p.id, url: p.url }))}
        />
      </section>
    </div>
  )
}
