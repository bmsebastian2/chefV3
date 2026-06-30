'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChefHat, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { RequestCard } from './RequestCard'
import { fetchClientRequests } from './actions'
import { type RequestGroup, type RequestsPayload } from './requests'

const TABS: { key: RequestGroup; label: string }[] = [
  { key: 'activas',     label: 'Activas' },
  { key: 'completadas', label: 'Completadas' },
  { key: 'canceladas',  label: 'Canceladas' },
]

export function RequestsTabs({
  initialActive,
  initialCounts,
  wizardUrl,
}: {
  initialActive: RequestsPayload
  initialCounts: Record<RequestGroup, number>
  wizardUrl: string
}) {
  const [activeTab, setActiveTab] = useState<RequestGroup>('activas')
  // Caché por pestaña. `activas` ya viene pre-poblada desde el server.
  // Que una clave exista (aunque sea []) = "ya cargada" → guarda anti-refetch.
  const [cache, setCache] = useState<Partial<Record<RequestGroup, RequestsPayload>>>({
    activas: initialActive,
  })
  // Conteos para los badges (livianos desde el server); se ajustan al cancelar.
  const [counts, setCounts] = useState<Record<RequestGroup, number>>(initialCounts)
  const [errors, setErrors] = useState<Partial<Record<RequestGroup, string>>>({})
  const [loadingGroup, setLoadingGroup] = useState<RequestGroup | null>(null)
  const [, startTransition] = useTransition()

  // Cancelación instantánea: saca la solicitud de activas, invalida la caché de
  // canceladas (se recargará con el dato fresco al abrirla) y ajusta los badges.
  function handleCancelled(id: string) {
    setCache((prev) => {
      const next = { ...prev }
      if (next.activas) {
        next.activas = {
          requests: next.activas.requests.filter((r) => r.id !== id),
          proposalCounts: next.activas.proposalCounts,
        }
      }
      delete next.canceladas
      return next
    })
    setCounts((prev) => ({
      ...prev,
      activas:    Math.max(0, prev.activas - 1),
      canceladas: prev.canceladas + 1,
    }))
  }

  function selectTab(key: RequestGroup) {
    setActiveTab(key)
    // Guarda de carga única: ya cargada o cargándose → no re-consultar.
    if (cache[key] !== undefined || loadingGroup === key) return

    setLoadingGroup(key)
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    startTransition(async () => {
      const res = await fetchClientRequests(key)
      if (res.error) {
        setErrors((prev) => ({ ...prev, [key]: res.error }))
      } else {
        setCache((prev) => ({
          ...prev,
          [key]: { requests: res.requests, proposalCounts: res.proposalCounts },
        }))
      }
      setLoadingGroup(null)
    })
  }

  const current = cache[activeTab]
  const isLoading = loadingGroup === activeTab && current === undefined
  const error = errors[activeTab]

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-zinc-100 mb-6">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          const count = counts[tab.key]
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={[
                'relative inline-flex items-center gap-1.5 px-3.5 py-2.5 -mb-px',
                'text-[13px] font-medium transition-colors',
                isActive
                  ? 'text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600',
              ].join(' ')}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                    isActive ? 'bg-accent/10 text-accent' : 'bg-zinc-100 text-zinc-400',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={() => selectTab(activeTab)} />
      ) : !current || current.requests.length === 0 ? (
        <EmptyState tab={activeTab} wizardUrl={wizardUrl} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {current.requests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              proposalCount={current.proposalCounts[req.id] ?? 0}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-l-4 border-zinc-100 border-l-zinc-200 bg-white shadow-sm overflow-hidden animate-pulse"
        >
          <div className="px-4 pt-4 pb-3">
            <div className="h-2.5 w-16 bg-zinc-100 rounded-full mb-3" />
            <div className="h-4 w-32 bg-zinc-100 rounded-md mb-2" />
            <div className="h-2.5 w-20 bg-zinc-100 rounded-full" />
          </div>
          <div className="border-t border-zinc-50 px-4 py-3 space-y-2.5">
            <div className="h-2.5 w-3/4 bg-zinc-100 rounded-full" />
            <div className="h-2.5 w-1/2 bg-zinc-100 rounded-full" />
          </div>
          <div className="border-t border-zinc-50 px-4 py-3">
            <div className="h-2.5 w-24 bg-zinc-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-16 text-center">
      <p className="text-sm text-zinc-500 mb-4">No pudimos cargar tus solicitudes.</p>
      <p className="text-xs text-zinc-400 mb-6 max-w-xs mx-auto">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}

function EmptyState({ tab, wizardUrl }: { tab: RequestGroup; wizardUrl: string }) {
  if (tab === 'activas') {
    return (
      <div className="relative overflow-hidden bg-white rounded-2xl border border-zinc-100 shadow-sm py-20 text-center">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
          <div className="absolute top-6 left-1/4 w-40 h-40 rounded-full border-[1.5px] border-zinc-800" />
          <div className="absolute bottom-4 right-1/4 w-24 h-24 rounded-full border-[1.5px] border-zinc-800" />
        </div>
        <div className="relative z-10">
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
              <ChefHat className="w-9 h-9 text-zinc-300" />
            </div>
            <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-lg">
              <Plus className="w-3.5 h-3.5 text-white" />
            </span>
          </div>
          <h3 className="font-serif text-xl font-semibold text-zinc-800 mb-2">
            Tu mesa está lista
          </h3>
          <p className="text-sm text-zinc-400 mb-7 max-w-[260px] mx-auto leading-relaxed">
            Hacé tu primera solicitud y recibí propuestas de chefs exclusivos en minutos.
          </p>
          <Link
            href={wizardUrl}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors shadow-md shadow-accent/20"
          >
            <Plus className="w-4 h-4" />
            Solicitar un chef
          </Link>
        </div>
      </div>
    )
  }

  const copy = {
    completadas: {
      icon: <CheckCircle2 className="w-8 h-8 text-zinc-300" />,
      title: 'Todavía no tenés solicitudes completadas',
      subtitle: 'Acá vas a ver tus servicios una vez finalizados.',
    },
    canceladas: {
      icon: <XCircle className="w-8 h-8 text-zinc-300" />,
      title: 'No tenés solicitudes canceladas',
      subtitle: 'Las solicitudes que canceles aparecerán en esta sección.',
    },
  }[tab]

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-5">
        {copy.icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-zinc-800 mb-1.5">
        {copy.title}
      </h3>
      <p className="text-sm text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
        {copy.subtitle}
      </p>
    </div>
  )
}
