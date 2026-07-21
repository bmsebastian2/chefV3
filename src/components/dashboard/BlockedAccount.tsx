'use client'

import { useEffect } from 'react'
import { Lock, MessageCircle, ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import { createClient } from '@/utils/supabase/clients'
import { formatPrice } from '@/lib/format'
import type { ChefBooking } from '@/components/dashboard/RequestsView'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   'Servicio único',
  multiple: 'Múltiples servicios',
  weekly:   'Semanal',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Tarjeta de SOLO LECTURA: nada de chat, propuestas ni edición — el chef
// bloqueado no recupera ninguna capacidad operativa, solo ve lo que ya cobró
// y todavía tiene que cumplir.
function ReadOnlyBookingCard({ booking }: { booking: ChefBooking }) {
  const dateStr = booking.event_date_end && booking.event_date_end !== booking.event_date_start
    ? `${formatDate(booking.event_date_start)} → ${formatDate(booking.event_date_end)}`
    : formatDate(booking.event_date_start)

  return (
    <div className="bg-white border border-zinc-100 border-l-4 border-l-emerald-500 rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Reservada</span>
          </span>
          <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0">
            <CalendarDays className="w-3 h-3" />
            {dateStr}
          </span>
        </div>
        <p className="font-serif text-[15px] font-semibold text-zinc-900 leading-snug">
          {booking.client_name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {SERVICE_TYPE_LABELS[booking.service_type] ?? booking.service_type}
          {booking.event_time && <> · {booking.event_time}</>}
          {' · '}<span className="font-medium text-zinc-700">{formatPrice(booking.total_amount)}</span>
        </p>
      </div>
      {booking.city && (
        <div className="border-t border-zinc-50 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 text-zinc-300 shrink-0" />
            {booking.city}
          </div>
        </div>
      )}
    </div>
  )
}

// Pantalla de cuenta deshabilitada por la administración. La renderiza el layout
// del dashboard EN LUGAR del sidebar + contenido, así el chef bloqueado queda
// contenido acá y no puede operar en ninguna subpágina.
//
// Orden mensaje → signOut: el layout (server) ya pintó esta vista CON la sesión
// válida; al montar, cerramos sesión en el cliente SIN redirigir, para que el
// chef no quede autenticado (cookies/memoria limpias, el header vuelve a
// "Acceder") pero alcance a leer el aviso y use sus salidas. No se puede cerrar
// sesión en el render del Server Component (escribe cookies), por eso va acá.
export function BlockedAccount({
  reason,
  bookings = [],
}: {
  reason?:   string | null
  bookings?: ChefBooking[]
}) {
  useEffect(() => {
    // signOut sin navegación: limpia la sesión pero deja la pantalla visible.
    createClient().auth.signOut().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className={bookings.length > 0 ? 'max-w-2xl w-full' : 'max-w-md w-full'}>
        <div className="max-w-md">
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
            <Lock className="w-7 h-7 text-red-500" />
          </div>

          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-px w-8 bg-accent rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Cuenta suspendida
            </span>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-3 leading-tight">
            Tu cuenta está deshabilitada
          </h1>

          <p className="text-sm text-zinc-500 leading-relaxed">
            La administración deshabilitó tu cuenta. Por ahora no podés recibir solicitudes,
            enviar propuestas ni aparecer públicamente. Escribinos para resolverlo y reactivar
            tu cuenta.
          </p>

          {reason && (
            <div className="mt-5 rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Motivo
              </p>
              <p className="text-sm text-zinc-700">{reason}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            {/* Navegación dura: el server reevalúa la sesión ya cerrada y el header
                arranca en "Acceder". */}
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </a>
            <a
              href="/#contacto"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Contactar a la administración
            </a>
          </div>
        </div>

        {bookings.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-px w-8 bg-accent rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Compromisos ya pagados
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-5 max-w-lg leading-relaxed">
              Estas reservas ya fueron pagadas por el cliente y siguen en pie: el bloqueo no las
              cancela. Tenés que cumplirlas igual, salvo que la administración decida lo
              contrario.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <ReadOnlyBookingCard key={b.id} booking={b} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
