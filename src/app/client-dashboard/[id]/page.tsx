import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { BackLink } from './proposals/BackLink'
import { formatPrice, formatPriceRange } from '@/lib/format'
import {
  LogOut, ArrowLeft, CalendarDays, MapPin,
  Users, Utensils, DollarSign, FileText, AlertCircle,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  new:                  'Nueva',
  active:               'Activa',
  pending_confirmation: 'Pendiente de confirmación',
  in_process:           'En proceso',
  paid:                 'Pagada',
  completed:            'Completada',
  cancelled:            'Cancelada',
  pending:              'Pendiente',
}

const STATUS_COLORS: Record<string, string> = {
  new:                  'bg-blue-50 text-blue-700 border-blue-200',
  active:               'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  in_process:           'bg-amber-50 text-amber-700 border-amber-200',
  paid:                 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:            'bg-zinc-100 text-zinc-600 border-zinc-200',
  cancelled:            'bg-red-50 text-red-700 border-red-200',
  pending:              'bg-amber-50 text-amber-700 border-amber-200',
}

const SERVICE_LABELS: Record<string, string> = {
  single:   'Servicio único',
  multiple: 'Múltiples servicios',
  weekly:   'Semanal',
}

const OCCASION_LABELS: Record<string, string> = {
  birthday:          'Cumpleaños',
  family_reunion:    'Reunión familiar',
  bachelor_party:    'Despedida de soltero/a',
  friends_gathering: 'Reunión de amigos',
  romantic_dinner:   'Cena romántica',
  corporate:         'Corporativo',
  gastronomic:       'Gastronómico',
  other:             'Otro',
}

const CUISINE_LABELS: Record<string, string> = {
  local:         'Cocina local / argentina',
  italian:       'Italiana',
  mediterranean: 'Mediterránea',
  seafood:       'Mariscos',
  french:        'Francesa',
  japanese:      'Japonesa',
  fusion:        'Fusión',
  chefs_special: 'A elección del chef',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Section({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-zinc-900 text-right">{value ?? '—'}</span>
    </div>
  )
}

type RequestDate = { fecha: string; desayuno?: boolean; almuerzo?: boolean; cena?: boolean }

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: request }, { data: userData }] = await Promise.all([
    supabase
      .from('service_requests')
      .select(`*, request_contact_info(*), request_restrictions(*), request_dates(*)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase.from('users').select('first_name, first_surname').eq('id', user.id).single(),
  ])

  if (!request) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contact   = (request.request_contact_info as any[])?.[0] ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restr     = (request.request_restrictions as any[])?.[0] ?? null
  const dates     = (request.request_dates ?? []) as RequestDate[]

  const activeRestrictions = restr ? [
    restr.vegetariano     && 'Vegetariano',
    restr.vegano          && 'Vegano',
    restr.sin_gluten      && 'Sin gluten',
    restr.sin_lactosa     && 'Sin lactosa',
    restr.sin_mariscos    && 'Sin mariscos',
    restr.sin_frutos_secos && 'Sin frutos secos',
  ].filter(Boolean) as string[] : []

  const name = [userData?.first_name, userData?.first_surname].filter(Boolean).join(' ') || user.email

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-bold text-zinc-900">
          GetChef.com
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500 hidden sm:block">{name}</span>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <div>
          <BackLink href="/client-dashboard" />

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-zinc-900">
                {SERVICE_LABELS[request.service_type] ?? request.service_type}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Creada el {new Date(request.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_COLORS[request.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
              {STATUS_LABELS[request.status] ?? request.status}
            </span>
          </div>
        </div>

        <Section title="Detalles del evento" icon={<CalendarDays className="w-4 h-4" />}>
          {request.occasion && <Row label="Ocasión" value={OCCASION_LABELS[request.occasion] ?? request.occasion} />}
          <Row label="Fecha" value={formatDate(request.event_date_start)} />
          {request.event_date_end && request.event_date_end !== request.event_date_start && (
            <Row label="Fecha fin" value={formatDate(request.event_date_end)} />
          )}
          {request.event_time && <Row label="Horario" value={request.event_time} />}
          <Row
            label="Ubicación"
            value={[request.location, request.city].filter(Boolean).join(', ') || null}
          />
        </Section>

        <Section title="Invitados" icon={<Users className="w-4 h-4" />}>
          <Row label="Adultos" value={request.guests_adults ?? 0} />
          {(request.guests_teens ?? 0) > 0 && <Row label="Adolescentes" value={request.guests_teens} />}
          {(request.guests_kids ?? 0) > 0 && <Row label="Niños" value={request.guests_kids} />}
        </Section>

        <Section title="Preferencias" icon={<Utensils className="w-4 h-4" />}>
          {request.cuisine_type
            ? <Row label="Tipo de cocina" value={CUISINE_LABELS[request.cuisine_type] ?? request.cuisine_type} />
            : null}
          {request.descripcion_evento ? (
            <div className="pt-2">
              <p className="text-xs text-zinc-400 mb-1.5">Descripción del evento</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{request.descripcion_evento}</p>
            </div>
          ) : null}
          {!request.cuisine_type && !request.descripcion_evento && (
            <p className="text-sm text-zinc-400">Sin preferencias especificadas.</p>
          )}
        </Section>

        {(activeRestrictions.length > 0 || restr?.alergias_adicionales || restr?.notas_adicionales) && (
          <Section title="Restricciones alimentarias" icon={<AlertCircle className="w-4 h-4" />}>
            {activeRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {activeRestrictions.map((r) => (
                  <span key={r} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full font-medium">
                    {r}
                  </span>
                ))}
              </div>
            )}
            {restr?.alergias_adicionales && <Row label="Alergias" value={restr.alergias_adicionales} />}
            {restr?.notas_adicionales && (
              <div className="pt-2">
                <p className="text-xs text-zinc-400 mb-1.5">Notas</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{restr.notas_adicionales}</p>
              </div>
            )}
          </Section>
        )}

        {(request.budget_min || request.budget_max) && (
          <Section title="Presupuesto estimado" icon={<DollarSign className="w-4 h-4" />}>
            <p className="text-lg font-semibold text-zinc-900">
              {request.budget_min && request.budget_max
                ? formatPriceRange(Number(request.budget_min), Number(request.budget_max))
                : request.budget_min
                ? `Desde ${formatPrice(Number(request.budget_min))}`
                : `Hasta ${formatPrice(Number(request.budget_max))}`}
            </p>
          </Section>
        )}

        {dates.length > 0 && (
          <Section title="Fechas del servicio" icon={<CalendarDays className="w-4 h-4" />}>
            <div className="space-y-0">
              {dates.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0">
                  <span className="text-sm text-zinc-700">
                    {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </span>
                  <div className="flex gap-1.5">
                    {d.desayuno && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Desayuno</span>}
                    {d.almuerzo && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Almuerzo</span>}
                    {d.cena    && <span className="text-xs bg-zinc-800 text-zinc-100 px-2 py-0.5 rounded-full">Cena</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {contact && (
          <Section title="Datos de contacto" icon={<FileText className="w-4 h-4" />}>
            {contact.full_name && <Row label="Nombre" value={contact.full_name} />}
            {contact.email     && <Row label="Email"  value={contact.email} />}
            {contact.phone     && <Row label="Teléfono" value={contact.phone} />}
          </Section>
        )}

        {request.location && (
          <Section title="Lugar del evento" icon={<MapPin className="w-4 h-4" />}>
            <p className="text-sm text-zinc-700">{request.location}</p>
            {request.city && <p className="text-xs text-zinc-400 mt-0.5">{request.city}</p>}
          </Section>
        )}

        <div className="flex items-center justify-between pt-2 pb-8">
          <Link
            href="/client-dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  )
}
