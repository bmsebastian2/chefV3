import { Calendar, MapPin, Users, Utensils, CheckCircle2 } from 'lucide-react'
import { CancelButton } from './CancelButtonClient'
import { ProposalsLink } from './ProposalsLink'
import { formatPrice, formatPriceRange } from '@/lib/format'
import type { ClientRequest } from './requests'

const STATUS_LABELS: Record<string, string> = {
  new:                  'Nueva',
  active:               'Activa',
  pending_confirmation: 'Pendiente',
  in_process:           'En proceso',
  paid:                 'Pagada',
  booked:               'Reservada',
  completed:            'Completada',
  cancelled:            'Cancelada',
  pending:              'Pendiente',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  new:                  'text-sky-600',
  active:               'text-emerald-600',
  pending_confirmation: 'text-amber-600',
  in_process:           'text-amber-600',
  paid:                 'text-emerald-600',
  booked:               'text-emerald-600',
  completed:            'text-emerald-700',
  cancelled:            'text-red-500',
  pending:              'text-amber-600',
}

const STATUS_DOT: Record<string, string> = {
  new:                  'bg-sky-500',
  active:               'bg-emerald-500',
  pending_confirmation: 'bg-amber-400',
  in_process:           'bg-amber-500',
  paid:                 'bg-emerald-400',
  booked:               'bg-emerald-500',
  completed:            'bg-zinc-400',
  cancelled:            'bg-red-400',
  pending:              'bg-amber-400',
}

const STATUS_LEFT_BORDER: Record<string, string> = {
  new:                  'border-l-sky-500',
  active:               'border-l-emerald-500',
  pending_confirmation: 'border-l-amber-400',
  in_process:           'border-l-amber-500',
  paid:                 'border-l-emerald-400',
  booked:               'border-l-emerald-500',
  completed:            'border-l-emerald-500',
  cancelled:            'border-l-red-300',
  pending:              'border-l-amber-400',
}

const SERVICE_LABELS: Record<string, string> = {
  single:   'Servicio único',
  multiple: 'Múltiples servicios',
  weekly:   'Semanal',
}

const CUISINE_LABELS: Record<string, string> = {
  local:         'Local / argentina',
  italian:       'Italiana',
  mediterranean: 'Mediterránea',
  seafood:       'Mariscos',
  french:        'Francesa',
  japanese:      'Japonesa',
  fusion:        'Fusión',
  chefs_special: 'A elección del chef',
}

const ACTIVE_STATUSES = new Set([
  'new', 'active', 'pending_confirmation', 'pending', 'booked',
])

export function RequestCard({
  req,
  proposalCount,
  onCancelled,
}: {
  req: ClientRequest
  proposalCount: number
  onCancelled?: (id: string) => void
}) {
  const totalGuests =
    (req.guests_adults ?? 0) + (req.guests_teens ?? 0) + (req.guests_kids ?? 0)

  const budget =
    req.budget_min && req.budget_max
      ? formatPriceRange(Number(req.budget_min), Number(req.budget_max))
      : req.budget_min
      ? `Desde ${formatPrice(Number(req.budget_min))}`
      : null

  const formattedDate = req.event_date_start
    ? new Date(req.event_date_start + 'T00:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  const lugar       = [req.location, req.city].filter(Boolean).join(', ')
  const canCancel   = req.status !== 'cancelled' && req.status !== 'completed'
  const isActive    = ACTIVE_STATUSES.has(req.status)
  const isCancelled = req.status === 'cancelled'
  const isCompleted = req.status === 'completed'

  return (
    <div
      className={[
        'group rounded-xl overflow-hidden shadow-sm',
        'border border-l-4',
        STATUS_LEFT_BORDER[req.status] ?? 'border-l-zinc-200',
        isCompleted
          ? 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100 ring-1 ring-emerald-200/60'
          : 'bg-white border-zinc-100',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        isCancelled ? 'opacity-55' : '',
      ].join(' ')}
    >
      {/* Top */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 ${STATUS_TEXT_COLORS[req.status] ?? 'text-zinc-500'}`}>
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[req.status] ?? 'bg-zinc-400'}`} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
          </span>
          {canCancel && <CancelButton requestId={req.id} onCancelled={onCancelled} />}
        </div>

        <p className="font-serif text-[15px] font-semibold text-zinc-900 leading-snug">
          {SERVICE_LABELS[req.service_type] ?? req.service_type}
        </p>
        {budget && (
          <p className="text-xs font-medium text-zinc-400 mt-0.5">{budget}</p>
        )}
      </div>

      {/* Detail rows */}
      <div className="border-t border-zinc-50 px-4 py-2">
        {(formattedDate || req.event_time) && (
          <DetailRow
            icon={<Calendar className="w-3 h-3" />}
            value={[formattedDate, req.event_time].filter(Boolean).join(' · ')}
          />
        )}
        {totalGuests > 0 && (
          <DetailRow
            icon={<Users className="w-3 h-3" />}
            value={`${totalGuests} persona${totalGuests !== 1 ? 's' : ''}`}
          />
        )}
        {req.cuisine_type && (
          <DetailRow
            icon={<Utensils className="w-3 h-3" />}
            value={CUISINE_LABELS[req.cuisine_type] ?? req.cuisine_type}
          />
        )}
        {lugar && (
          <DetailRow icon={<MapPin className="w-3 h-3" />} value={lugar} />
        )}
      </div>

      {/* Proposals footer */}
      <div className={`border-t px-4 py-3 flex items-center justify-between ${proposalCount > 0 ? 'border-zinc-100 bg-zinc-50/60' : 'border-zinc-50'}`}>
        <span className="text-[11px] font-medium text-zinc-400">Propuestas</span>
        {proposalCount > 0 ? (
          <ProposalsLink
            href={`/client-dashboard/${req.id}/proposals`}
            count={proposalCount}
          />
        ) : (
          <span className={`text-[11px] font-medium ${isActive ? 'text-amber-500' : 'text-zinc-400'}`}>
            {isActive ? 'En espera…' : 'Sin propuestas'}
          </span>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-50 last:border-0">
      <span className="text-zinc-300 shrink-0">{icon}</span>
      <span className="text-xs text-zinc-500 truncate">{value}</span>
    </div>
  )
}
