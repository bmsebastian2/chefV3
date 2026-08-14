import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChefHat, CheckCircle2, CalendarDays, ArrowRight } from 'lucide-react'
import { OCCASION_LABELS } from '@/components/dashboard/RequestsView'

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

type NextBooking = {
  occasion: string | null
  event_date_start: string
}

export function ActivitySnapshot({
  hasBookings,
  completedCount,
  nextBooking,
  meetsRequirements,
  isActive,
  firstPendingHref,
  pendingRequestsCount,
}: {
  hasBookings: boolean
  completedCount: number
  nextBooking: NextBooking | null
  meetsRequirements: boolean
  isActive: boolean
  firstPendingHref: string | null
  pendingRequestsCount: number
}) {
  // Chef sin actividad todavía: una sola card cálida con la próxima acción
  // concreta según en qué paso está, en vez de una grilla de stats en cero.
  if (!hasBookings) {
    let headline: string
    let body: ReactNode

    if (!meetsRequirements) {
      headline = 'Construí tu perfil, paso a paso'
      body = (
        <>
          Completá tu perfil para empezar a aparecer en las búsquedas de los clientes.{' '}
          <Link
            href={firstPendingHref ?? '/dashboard/menus'}
            className="inline-flex items-center gap-1 text-accent font-semibold hover:text-accent/80"
          >
            Seguir completando
            <ArrowRight className="w-3 h-3" />
          </Link>
        </>
      )
    } else if (!isActive) {
      headline = 'Tu perfil está listo'
      body = 'Activalo arriba para que los clientes te encuentren.'
    } else if (pendingRequestsCount > 0) {
      headline =
        pendingRequestsCount === 1
          ? 'Tenés 1 solicitud esperando tu propuesta'
          : `Tenés ${pendingRequestsCount} solicitudes esperando tu propuesta`
      body = (
        <>
          Mirala antes de que la tome otro chef.{' '}
          <Link
            href="/dashboard/requests"
            className="inline-flex items-center gap-1 text-accent font-semibold hover:text-accent/80"
          >
            Ver solicitudes
            <ArrowRight className="w-3 h-3" />
          </Link>
        </>
      )
    } else {
      headline = 'Tu primer pedido está por llegar'
      body = (
        <>
          Tu perfil está activo y visible.{' '}
          <Link
            href="/dashboard/demanda"
            className="inline-flex items-center gap-1 text-accent font-semibold hover:text-accent/80"
          >
            Mirá dónde están pidiendo chef ahora
            <ArrowRight className="w-3 h-3" />
          </Link>
        </>
      )
    }

    return (
      <div className="flex items-start gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 md:p-6 mb-8">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent/12 ring-1 ring-accent/25">
          <ChefHat className="h-5 w-5 text-accent" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 mb-1">{headline}</p>
          <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
        </div>
      </div>
    )
  }

  // Chef con actividad real: tiles con datos concretos, solo los que aplican.
  const tiles: { key: string; label: string; value: string; icon: ReactNode }[] = []

  if (completedCount > 0) {
    tiles.push({
      key: 'completed',
      label: completedCount === 1 ? 'servicio completado' : 'servicios completados',
      value: String(completedCount),
      icon: <CheckCircle2 className="w-4 h-4 text-accent" />,
    })
  }

  if (nextBooking) {
    const occasionLabel = OCCASION_LABELS[nextBooking.occasion ?? ''] ?? 'agendado'
    tiles.push({
      key: 'next',
      label: `Próximo servicio · ${occasionLabel}`,
      value: formatShortDate(nextBooking.event_date_start),
      icon: <CalendarDays className="w-4 h-4 text-accent" />,
    })
  }

  if (tiles.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="flex-1 min-w-[160px] bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 mb-3">
            {tile.icon}
          </span>
          <p className="font-serif text-2xl font-semibold text-zinc-900 leading-none mb-1">
            {tile.value}
          </p>
          <p className="text-xs text-zinc-500">{tile.label}</p>
        </div>
      ))}
    </div>
  )
}
