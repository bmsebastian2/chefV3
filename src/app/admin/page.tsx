export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/utils/supabase/admin'
import { Banknote, Undo2, ShieldCheck } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { ProcessButton } from './ProcessButton'

type Payout = {
  booking_id:         string
  chef_id:            string
  request_id:         string
  total_amount:       number
  commission_amount:  number
  chef_payout_amount: number
  currency:           string
  completed_at:       string
}

type Refund = {
  id:            string
  request_id:    string
  total_amount:  number | null
  currency:      string | null
  cancelled_at:  string | null
  cancel_reason: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminPage() {
  const admin = createAdminClient()

  // ── Payouts liberables (completed + paid + payout pending + 3 días) ──
  const { data: payoutsRaw } = await admin.rpc('get_releasable_bookings')
  const payouts = (payoutsRaw ?? []) as Payout[]

  // ── Reembolsos pendientes (cancelled + plata todavía retenida) ──
  const { data: refundsRaw } = await admin
    .from('bookings')
    .select('id, request_id, total_amount, currency, cancelled_at, cancel_reason')
    .eq('booking_status', 'cancelled')
    .eq('payment_status', 'paid')
    .order('cancelled_at', { ascending: true })
  const refunds = (refundsRaw ?? []) as Refund[]

  // ── Nombres de chefs (para payouts) ──
  const chefIds = [...new Set(payouts.map((p) => p.chef_id))]
  const chefNameMap: Record<string, string> = {}
  if (chefIds.length > 0) {
    const { data: profiles } = await admin
      .from('chef_profiles')
      .select('id, user_id')
      .in('id', chefIds)
    const userIds = (profiles ?? []).map((p) => p.user_id as string)
    const { data: users } = userIds.length > 0
      ? await admin.from('users').select('id, first_name, first_surname').in('id', userIds)
      : { data: [] as { id: string; first_name: string | null; first_surname: string | null }[] }
    const userById = Object.fromEntries((users ?? []).map((u) => [u.id, u]))
    for (const p of profiles ?? []) {
      const u = userById[p.user_id as string]
      chefNameMap[p.id as string] = u
        ? [u.first_name, u.first_surname].filter(Boolean).join(' ') || 'Chef'
        : 'Chef'
    }
  }

  // ── Datos de contacto del cliente (para reembolsos) ──
  const refundReqIds = [...new Set(refunds.map((r) => r.request_id))]
  const contactMap: Record<string, { name: string; email: string }> = {}
  if (refundReqIds.length > 0) {
    const { data: contacts } = await admin
      .from('request_contact_info')
      .select('request_id, full_name, email')
      .in('request_id', refundReqIds)
    for (const c of contacts ?? []) {
      contactMap[c.request_id as string] = {
        name:  (c.full_name as string) ?? 'Cliente',
        email: (c.email as string) ?? '',
      }
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 pt-12 pb-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Administración
          </span>
        </div>
        <h1 className="font-serif text-4xl font-semibold text-zinc-900 leading-tight mb-2">
          Pagos y reembolsos
        </h1>
        <p className="text-sm text-zinc-500">
          Liberá pagos a chefs y cerrá reembolsos. Hacé el giro real por fuera y marcalo acá.
        </p>
      </div>

      {/* ── Payouts ── */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Pagos a liberar
          </h2>
          {payouts.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {payouts.length}
            </span>
          )}
        </div>

        {payouts.length === 0 ? (
          <EmptyCard text="No hay pagos pendientes de liberar." />
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.booking_id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm">Chef {chefNameMap[p.chef_id] ?? '—'}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Completado {fmtDate(p.completed_at)} · total {formatPrice(p.total_amount)} · comisión {formatPrice(p.commission_amount)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">A girar</p>
                  <p className="font-serif text-lg font-bold text-emerald-700 leading-none">
                    {formatPrice(p.chef_payout_amount)}
                  </p>
                </div>
                <ProcessButton bookingId={p.booking_id} kind="payout" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Refunds ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Undo2 className="w-4 h-4 text-amber-600" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Reembolsos pendientes
          </h2>
          {refunds.length > 0 && (
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              {refunds.length}
            </span>
          )}
        </div>

        {refunds.length === 0 ? (
          <EmptyCard text="No hay reembolsos pendientes." />
        ) : (
          <div className="space-y-3">
            {refunds.map((r) => {
              const contact = contactMap[r.request_id]
              return (
                <div key={r.id} className="bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm">{contact?.name ?? 'Cliente'}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {contact?.email && <>{contact.email} · </>}
                      Cancelado {fmtDate(r.cancelled_at)}
                      {r.cancel_reason && <> · {r.cancel_reason}</>}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">A reembolsar</p>
                    <p className="font-serif text-lg font-bold text-amber-700 leading-none">
                      {r.total_amount != null ? formatPrice(r.total_amount) : '—'}
                    </p>
                  </div>
                  <ProcessButton bookingId={r.id} kind="refund" />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl shadow-sm py-10 text-center">
      <ShieldCheck className="w-7 h-7 text-zinc-200 mx-auto mb-2" />
      <p className="text-sm text-zinc-400">{text}</p>
    </div>
  )
}
