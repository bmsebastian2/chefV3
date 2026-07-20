import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, Wallet } from 'lucide-react'
import { ActiveToggle } from '@/components/dashboard/ActiveToggle'

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
  { key: 'account_done',        label: 'Mi Cuenta',                   href: null,                          desc: 'Registro completado.' },
  { key: 'bio_done',            label: 'Bio Profesional',              href: '/dashboard/perfil',           desc: 'Escribe tu presentación y bio.' },
  { key: 'location_done',       label: 'Ubicación',                   href: '/dashboard/ubicacion',        desc: 'Añade tu ciudad y país.' },
  { key: 'profile_picture_done',label: 'Foto de Perfil',              href: '/dashboard/fotos',            desc: 'Sube tu foto de perfil.' },
  { key: 'gallery_done',        label: 'Fotos de Galería',            href: '/dashboard/fotos',            desc: 'Añade fotos de tus platos.' },
  { key: 'menus_done',          label: 'Menús',                       href: '/dashboard/menus',            desc: 'Crea al menos 1 menú.' },
  { key: 'request_prefs_done',  label: 'Preferencias de Solicitudes', href: '/dashboard/request-settings', desc: 'Elige los tipos de servicio que aceptas.' },
  { key: 'payments_done',       label: 'Pagos',                       href: '/dashboard/pagos',            desc: 'Cargá tu cuenta para recibir tus ganancias.' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: userData }, { data: chefProfile }] = await Promise.all([
    supabase.from('users').select('first_name').eq('id', user.id).single(),
    supabase.from('chef_profiles').select('id, is_active').eq('user_id', user.id).single(),
  ])

  let completion: CompletionRow | null = null
  let profilePhotoUrl: string | null = null
  let meetsRequirements = false
  let heldBookings = 0

  if (chefProfile) {
    const [
      { data: completionData },
      { data: photoData },
      { count: profilePhotoCount },
      { count: galleryCount },
      { count: menuCount },
      { count: dishCount },
      { count: heldCount },
    ] = await Promise.all([
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
      supabase
        .from('chef_photos')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefProfile.id)
        .eq('type', 'profile'),
      supabase
        .from('chef_photos')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefProfile.id)
        .eq('type', 'gallery'),
      supabase
        .from('chef_menus')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefProfile.id)
        .eq('is_active', true),
      supabase
        .from('dishes')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefProfile.id)
        .eq('is_active', true),
      // Dinero ya cobrado al cliente y todavía retenido para este chef.
      // "Escrow" = payment_status 'paid' + payout_status 'pending'.
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chefProfile.id)
        .eq('payment_status', 'paid')
        .eq('payout_status', 'pending'),
    ])
    completion = completionData
    profilePhotoUrl = photoData?.url ?? null
    heldBookings = heldCount ?? 0
    meetsRequirements =
      (profilePhotoCount ?? 0) >= 1 &&
      (galleryCount ?? 0) >= 12 &&
      (menuCount ?? 0) >= 3 &&
      (dishCount ?? 0) >= 6
  }

  const doneCount = ITEMS.filter((item) => completion?.[item.key]).length
  const pct = Math.round((doneCount / ITEMS.length) * 100)
  const firstName = userData?.first_name || user.email?.split('@')[0] || 'Chef'

  // Aviso de datos de pago pendientes. Se muestra SOLO si además hay dinero
  // retenido: sin cuenta cargada no podemos liquidarle, y el chef no tiene otra
  // forma de enterarse (el checklist ya no lo mira una vez que se registró).
  const payoutBlocked = !completion?.payments_done && heldBookings > 0

  return (
    <div className="p-6 md:p-10 max-w-3xl">

      {payoutBlocked && (
        <Link
          href="/dashboard/pagos"
          className="flex items-start gap-3.5 bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 mb-6 hover:bg-amber-100/70 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 mb-0.5">
              Completá tus datos de pago
            </p>
            <p className="text-sm text-amber-800/90 leading-relaxed">
              {heldBookings === 1
                ? 'Tenés 1 servicio con el pago retenido.'
                : `Tenés ${heldBookings} servicios con el pago retenido.`}{' '}
              No podemos depositarte hasta que cargues tu cuenta bancaria.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* ── Profile hero card ── */}
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 mb-8">
        {/* Decorative concentric circles */}
        <div className="absolute top-0 right-0 w-56 h-56 pointer-events-none opacity-[0.035] -translate-y-1/4 translate-x-1/4">
          <div className="absolute inset-0 rounded-full border-[1.5px] border-zinc-800" />
          <div className="absolute inset-8 rounded-full border-[1.5px] border-zinc-800" />
          <div className="absolute inset-16 rounded-full border-[1.5px] border-zinc-800" />
          <div className="absolute inset-24 rounded-full border-[1.5px] border-zinc-800" />
        </div>

        <div className="relative z-10 p-6 md:p-8">

          {/* Avatar + name + large % */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 flex-shrink-0 shadow-sm">
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt={firstName}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 font-serif text-2xl font-semibold">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-px w-5 bg-accent rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Chef
                  </span>
                </div>
                <h1 className="font-serif text-2xl md:text-3xl font-semibold text-zinc-900 leading-tight">
                  {firstName}
                </h1>
              </div>
            </div>

            {/* Large percentage display */}
            <div className="text-right shrink-0">
              <div className="leading-none mb-1">
                <span className="font-serif text-5xl font-bold text-zinc-900">{pct}</span>
                <span className="font-serif text-xl font-light text-zinc-400">%</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                completado
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">
                {doneCount} de {ITEMS.length} secciones
              </span>
              {doneCount < ITEMS.length && (
                <span className="text-xs font-medium text-zinc-400">
                  {ITEMS.length - doneCount} por completar
                </span>
              )}
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Active toggle */}
          {chefProfile && (
            <ActiveToggle
              chefId={chefProfile.id}
              initialActive={chefProfile.is_active ?? false}
              meetsRequirements={meetsRequirements}
            />
          )}
        </div>
      </div>

      {/* ── Checklist ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Configurar perfil
          </h2>
          {doneCount < ITEMS.length && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {ITEMS.length - doneCount} pendientes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ITEMS.map((item) => {
            const done   = completion?.[item.key] ?? false
            const locked = item.href === null && !done

            return (
              <div
                key={item.key}
                className={[
                  'relative rounded-xl border transition-all duration-150 overflow-hidden',
                  done
                    ? 'bg-emerald-50/40 border-emerald-100'
                    : locked
                    ? 'bg-zinc-50 border-zinc-100 opacity-55'
                    : 'bg-white border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-0.5',
                ].join(' ')}
              >
                {/* Left accent bar for pending items */}
                {!done && !locked && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-l-xl" />
                )}

                <div className={`flex items-start gap-3 p-4 ${!done && !locked ? 'pl-5' : ''}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${done ? 'text-emerald-500' : 'text-zinc-300'}`}>
                    {done
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Circle className="w-5 h-5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wider ${done ? 'text-emerald-700/60' : 'text-zinc-600'}`}>
                      {item.label}
                    </p>

                    {done ? (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Completado
                      </span>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className="group/link inline-flex items-center gap-1 mt-1.5 text-xs text-accent hover:text-accent/80 font-semibold"
                      >
                        {item.desc}
                        <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <p className="text-xs text-zinc-400 mt-1">{item.desc}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
