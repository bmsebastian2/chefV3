import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PerfilForm } from '@/components/dashboard/PerfilForm'
import type { PerfilInitialData } from '@/components/dashboard/PerfilForm'

export default async function PerfilProfesionalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select(`
      id,
      tagline,
      acerca_de_mi,
      para_mi_cocinar_es,
      aprendi_a_cocinar,
      mi_secreto_cocina,
      experience_years,
      sitio_web,
      instagram,
      facebook,
      youtube,
      linkedin
    `)
    .eq('user_id', user.id)
    .single()

  if (!chef) redirect('/dashboard')

  const { data: langRows } = await supabase
    .from('chef_languages')
    .select('language_code')
    .eq('chef_id', chef.id)

  const initialData: PerfilInitialData = {
    tagline:            chef.tagline,
    acerca_de_mi:       chef.acerca_de_mi,
    para_mi_cocinar_es: chef.para_mi_cocinar_es,
    aprendi_a_cocinar:  chef.aprendi_a_cocinar,
    mi_secreto_cocina:  chef.mi_secreto_cocina,
    experience_years:   chef.experience_years,
    sitio_web:          chef.sitio_web,
    instagram:          chef.instagram,
    facebook:           chef.facebook,
    youtube:            chef.youtube,
    linkedin:           chef.linkedin,
    languages:          langRows?.map((r) => r.language_code) ?? [],
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Configuración
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Perfil Profesional</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Esta información aparecerá en tu perfil público para que los clientes te conozcan.
        </p>
      </div>
      <PerfilForm initialData={initialData} />
    </div>
  )
}
