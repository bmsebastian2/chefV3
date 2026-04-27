import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

type CompletionRow = {
  account_done: boolean
  bio_done: boolean
  location_done: boolean
  profile_picture_done: boolean
  gallery_done: boolean
  menus_done: boolean
  payments_done: boolean
  request_prefs_done: boolean
}

const ITEMS: {
  key: keyof CompletionRow
  label: string
  href: string | null
  desc: string
}[] = [
  { key: 'account_done',        label: 'Mi Cuenta',                   href: null,                       desc: 'Registro completado.' },
  { key: 'bio_done',            label: 'Bio Profesional',              href: '/dashboard/perfil',        desc: 'Escribe tu presentación y bio.' },
  { key: 'location_done',       label: 'Ubicación',                   href: '/dashboard/ubicacion',     desc: 'Añade tu ciudad y país.' },
  { key: 'profile_picture_done',label: 'Foto de Perfil',              href: '/dashboard/fotos',         desc: 'Sube tu foto de perfil.' },
  { key: 'gallery_done',        label: 'Fotos de Galería',            href: '/dashboard/fotos',         desc: 'Añade fotos de tus platos.' },
  { key: 'menus_done',          label: 'Menús',                       href: '/dashboard/menus',         desc: 'Crea al menos 1 menú.' },
  { key: 'request_prefs_done',  label: 'Preferencias de Solicitudes', href: '/dashboard/configuracion', desc: 'Elige los tipos de servicio que aceptas.' },
  { key: 'payments_done',       label: 'Pagos',                       href: null,                       desc: 'Próximamente disponible.' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: userData }, { data: chefProfile }] = await Promise.all([
    supabase.from('users').select('first_name').eq('id', user.id).single(),
    supabase.from('chef_profiles').select('id').eq('user_id', user.id).single(),
  ])

  let completion: CompletionRow | null = null
  let profilePhotoUrl: string | null = null

  if (chefProfile) {
    const [{ data: completionData }, { data: photoData }] = await Promise.all([
      supabase
        .from('profile_completion')
        .select('account_done, bio_done, location_done, profile_picture_done, gallery_done, menus_done, payments_done, request_prefs_done')
        .eq('chef_id', chefProfile.id)
        .single(),
      supabase
        .from('chef_photos')
        .select('url')
        .eq('chef_id', chefProfile.id)
        .eq('type', 'profile')
        .maybeSingle(),
    ])
    completion = completionData
    profilePhotoUrl = photoData?.url ?? null
  }

  const doneCount = ITEMS.filter((item) => completion?.[item.key]).length
  const pct = Math.round((doneCount / ITEMS.length) * 100)
  const firstName = userData?.first_name || user.email?.split('@')[0] || 'Chef'

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      {/* Welcome + progress */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 flex-shrink-0">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt={firstName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-serif text-xl font-semibold">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-zinc-900">
              Bienvenido/a, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Completa tu perfil para empezar a recibir solicitudes
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700">
            Tu perfil está <span className="text-accent">{pct}% completo</span>
          </span>
          <span className="text-sm text-muted-foreground">{doneCount} / {ITEMS.length}</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2.5">
          <div
            className="bg-accent h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map((item) => {
          const done = completion?.[item.key] ?? false
          return (
            <div
              key={item.key}
              className="bg-white border border-zinc-200 rounded-xl p-4 flex items-start gap-3 shadow-sm"
            >
              <div className={`mt-0.5 flex-shrink-0 ${done ? 'text-emerald-500' : 'text-zinc-300'}`}>
                {done
                  ? <CheckCircle2 className="w-5 h-5" />
                  : <Circle className="w-5 h-5" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {item.label}
                </p>
                {done ? (
                  <span className="inline-block mt-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    Completado
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 mt-1 text-xs text-accent hover:underline font-medium"
                  >
                    {item.desc} <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
