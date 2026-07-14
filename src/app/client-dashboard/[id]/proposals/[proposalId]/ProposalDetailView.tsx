"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Send, Share2, MoreHorizontal,
  Star, CheckCircle2, XCircle, Loader2,
} from "lucide-react"
import { rejectProposal, sendClientMessage, getMessages } from "./actions"
import { BookingPanel } from "./BookingPanel"
import { formatPrice } from "@/lib/format"

// ── Types ──────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id:          string
  sender_id:   string
  sender_name: string
  content:     string
  is_read:     boolean
  sent_at:     string
}

type OtherProposal = {
  id:               string
  chefName:         string
  photoUrl:         string | null
  price_per_person: number | null
}

type Props = {
  requestId:   string
  currentUserId: string
  reservedElsewhere: boolean
  booking: {
    id:        string
    status:    string
    hasReview: boolean
  } | null
  proposal: {
    id:               string
    message:          string | null
    menu_description: string | null
    price_per_person: number | null
    status:           string
    created_at:       string
  }
  chef: {
    name:             string
    photoUrl:         string | null
    tagline:          string | null
    acerca_de_mi:     string | null
    experience_years: number | null
    galleryPhotos:    { id: string; url: string }[]
  }
  request: {
    event_date_start: string
    event_date_end:   string | null
    event_time:       string | null
    service_type:     string
    meal_label:       string | null
    dateStr:          string
  }
  otherProposals:  OtherProposal[]
  initialMessages: ChatMessage[]
}

type Tab = "propuesta" | "mensajes" | "chef" | "ejemplos"

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

function parseMenuDescription(text: string) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let bullets: string[] = []
  let k = 0

  const flushBullets = () => {
    if (!bullets.length) return
    elements.push(
      <ul key={`ul-${k++}`} className="mb-4 rounded-xl border border-zinc-100 bg-zinc-50 overflow-hidden divide-y divide-zinc-100">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/70 flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flushBullets(); continue }
    if (line.startsWith("•") || line.startsWith("-")) {
      bullets.push(line.replace(/^[•\-]\s*/, ""))
      continue
    }
    flushBullets()
    const isAllCaps = line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line)
    if (isAllCaps) {
      elements.push(
        <div key={`h2-${k++}`} className="flex items-center gap-3 mt-8 mb-4 first:mt-0">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{line}</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      )
    } else {
      elements.push(
        <div key={`h3-${k++}`} className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
          <span className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
          <h3 className="text-sm font-semibold text-zinc-800">{line}</h3>
        </div>
      )
    }
  }
  flushBullets()
  return <div>{elements}</div>
}

const TABS: { id: Tab; label: string }[] = [
  { id: "propuesta", label: "Propuesta" },
  { id: "mensajes",  label: "Mensajes" },
  { id: "chef",      label: "Chef" },
  { id: "ejemplos",  label: "Ejemplos menú" },
]

type PriceCTAProps = {
  compact?:          boolean
  price_per_person:  number | null
  isPending:         boolean
  isAccepted:        boolean
  isAccepting:       boolean
  reservedElsewhere: boolean
  onAccept:          () => void
}

function PriceCTA({ compact, price_per_person, isPending, isAccepted, isAccepting, reservedElsewhere, onAccept }: PriceCTAProps) {
  return (
    <>
      {compact ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Menú</p>
            <p className="text-base font-bold text-zinc-900">
              {price_per_person ? formatPrice(price_per_person) : "A consultar"}
              {price_per_person && (
                <span className="text-xs font-normal text-zinc-400"> / persona</span>
              )}
            </p>
          </div>
          {isPending && !reservedElsewhere ? (
            <button
              type="button"
              onClick={onAccept}
              disabled={isAccepting}
              className="px-5 py-2 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors flex-shrink-0"
            >
              {isAccepting ? "Reservando..." : "Reservar"}
            </button>
          ) : isPending && reservedElsewhere ? (
            <span className="px-4 py-2 rounded-xl text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0 text-center">
              Reserva activa en otra propuesta
            </span>
          ) : (
            <span className={`px-4 py-2 rounded-xl text-xs font-semibold border flex-shrink-0 ${
              isAccepted
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-500 border-zinc-200"
            }`}>
              {isAccepted ? "✓ Reservado" : "Rechazada"}
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-5">
            <span className="text-sm text-zinc-500">Menú</span>
            <span className="text-2xl font-bold text-zinc-900">
              {price_per_person ? formatPrice(price_per_person) : "A consultar"}
              {price_per_person && (
                <span className="text-sm font-normal text-zinc-400"> / persona</span>
              )}
            </span>
          </div>
          {isPending && !reservedElsewhere ? (
            <button
              type="button"
              onClick={onAccept}
              disabled={isAccepting}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {isAccepting ? "Reservando..." : "Reservar"}
            </button>
          ) : isPending && reservedElsewhere ? (
            <div className="w-full py-3 rounded-xl text-sm font-semibold text-center border bg-amber-50 text-amber-700 border-amber-200">
              Ya tenés una reserva activa para esta solicitud
            </div>
          ) : (
            <div className={`w-full py-3 rounded-xl text-sm font-semibold text-center border ${
              isAccepted
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-500 border-zinc-200"
            }`}>
              {isAccepted ? "✓ Reservado" : "Propuesta rechazada"}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProposalDetailView({
  requestId,
  currentUserId,
  reservedElsewhere,
  booking,
  proposal,
  chef,
  request,
  otherProposals,
  initialMessages,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("propuesta")
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isPendingMsg, startMsgTransition] = useTransition()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, startRejectTransition] = useTransition()
  const [status, setStatus] = useState(proposal.status)
  const [menuOpen, setMenuOpen] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [loadingProposalId, setLoadingProposalId] = useState<string | null>(null)
  const [backLoading, setBackLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTab === "mensajes") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, activeTab])

  useEffect(() => {
    if (activeTab !== "mensajes") return
    const poll = async () => {
      const data = await getMessages(proposal.id)
      if (data.length > 0) setMessages(data as ChatMessage[])
    }
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [proposal.id, activeTab])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isPendingMsg) return
    setMsgError(null)
    setInput("")
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(), sender_id: currentUserId,
      sender_name: "Tú", content: text, is_read: false, sent_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    startMsgTransition(async () => {
      const result = await sendClientMessage(proposal.id, text)
      if (result.error) {
        setMsgError(result.error)
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setInput(text)
      }
    })
  }

  const handleAccept = () => {
    setIsAccepting(true)
    router.push(`/client-dashboard/${requestId}/proposals/${proposal.id}/booking`)
  }

  const handleReject = () => {
    setMenuOpen(false)
    startRejectTransition(async () => {
      const result = await rejectProposal(proposal.id, requestId)
      if (!result.error) { setStatus("rejected"); router.refresh() }
    })
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: `Propuesta del Chef ${chef.name}`, url })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const isPending  = status === "pending"
  const isAccepted = status === "accepted"
  const { dateStr } = request

  // Fecha de referencia del servicio (cuándo se considera "ocurrido"):
  //   single → event_date_start · multiple → event_date_end (último día) · weekly → event_date_start
  const serviceDate = request.event_date_end ?? request.event_date_start

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <div className=" sticky top-0 z-10 bg-zinc-50/90 backdrop-blur border-b border-zinc-200 px-6 py-3 flex items-center gap-3">
        <Link
          href={`/client-dashboard/${requestId}/proposals`}
          onClick={() => setBackLoading(true)}
          className="pl-12 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {backLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
          Mis propuestas
        </Link>
      </div>

      {/* Mobile price strip */}
      <div className="lg:hidden mx-6 mt-4 p-4 bg-white border border-zinc-200 rounded-xl">
        <PriceCTA
          compact
          price_per_person={proposal.price_per_person}
          isPending={isPending}
          isAccepted={isAccepted}
          isAccepting={isAccepting}
          reservedElsewhere={reservedElsewhere}
          onAccept={handleAccept}
        />
      </div>

      {/* Mobile booking lifecycle */}
      {booking && (
        <div className="lg:hidden mx-6 mt-4">
          <BookingPanel
            bookingId={booking.id}
            requestId={requestId}
            proposalId={proposal.id}
            bookingStatus={booking.status}
            hasReview={booking.hasReview}
            chefName={chef.name}
            serviceDate={serviceDate}
          />
        </div>
      )}

      <div className="flex gap-6 px-6 py-6 max-w-4xl">

        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Chef header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-200 flex-shrink-0 ring-2 ring-white shadow-sm">
              {chef.photoUrl ? (
                <Image src={chef.photoUrl} alt={chef.name} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                  {chef.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900 truncate">
                Propuesta del Chef {chef.name}
              </h1>
              {chef.tagline && (
                <p className="text-sm text-zinc-500 mt-0.5 truncate">{chef.tagline}</p>
              )}
            </div>

            {/* 3-dot menu */}
            {isPending && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors text-zinc-500"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-20">
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={isRejecting}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {isRejecting ? "Rechazando..." : "Rechazar propuesta"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Non-pending status badge */}
          {!isPending && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border mb-4 ${
              isAccepted
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {isAccepted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isAccepted ? "Propuesta aceptada" : "Propuesta rechazada"}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-zinc-200 mb-6">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-accent text-accent"
                      : "border-transparent text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab: Propuesta ─────────────────────────────────────────────── */}
          {activeTab === "propuesta" && (
            <div>
              {proposal.menu_description
                ? parseMenuDescription(proposal.menu_description)
                : <p className="text-sm text-zinc-400">El chef no especificó un menú detallado.</p>
              }
              {proposal.message && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-zinc-200 flex gap-3">
                  <div className="w-1 rounded-full bg-accent flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Mensaje del chef
                    </p>
                    <p className="text-sm text-zinc-700 leading-relaxed italic">
                      {proposal.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Mensajes ──────────────────────────────────────────────── */}
          {activeTab === "mensajes" && (
            <div className="flex flex-col gap-4">
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-zinc-400 py-10">
                    Todavía no hay mensajes. Escribile al chef.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.sender_id === currentUserId
                    return (
                      <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && (
                            <span className="text-xs text-zinc-400 px-1">{m.sender_name}</span>
                          )}
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? "bg-accent text-white rounded-br-sm"
                              : "bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm"
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-xs text-zinc-400 px-1">{formatTime(m.sent_at)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {msgError && <p className="text-xs text-red-500">{msgError}</p>}

              <div className="flex items-end gap-2 pt-2 border-t border-zinc-100">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder="Escribile al chef..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors max-h-28 overflow-y-auto"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isPendingMsg}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Chef ──────────────────────────────────────────────────── */}
          {activeTab === "chef" && (
            <div className="space-y-4">
              {chef.experience_years != null && (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {chef.experience_years} año{chef.experience_years !== 1 ? "s" : ""} de experiencia
                </div>
              )}
              {chef.tagline && (
                <p className="text-zinc-800 font-medium">{chef.tagline}</p>
              )}
              {chef.acerca_de_mi && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Sobre mí</p>
                  <p className="text-sm text-zinc-700 leading-relaxed">{chef.acerca_de_mi}</p>
                </div>
              )}
              {!chef.tagline && !chef.acerca_de_mi && chef.experience_years == null && (
                <p className="text-sm text-zinc-400">El chef aún no completó su perfil.</p>
              )}
            </div>
          )}

          {/* ── Tab: Ejemplos menú ─────────────────────────────────────────── */}
          {activeTab === "ejemplos" && (
            <div>
              {chef.galleryPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {chef.galleryPhotos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.url}
                      alt="Trabajo del chef"
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">El chef no subió fotos de trabajo todavía.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar (desktop only) ──────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">

            {/* Price + CTA card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
                Propuesta del Chef {chef.name}
              </p>
              <p className="text-xs text-zinc-400 mb-5">
                {dateStr}
                {request.meal_label && ` · ${request.meal_label}`}
              </p>

              <PriceCTA
                price_per_person={proposal.price_per_person}
                isPending={isPending}
                isAccepted={isAccepted}
                isAccepting={isAccepting}
                reservedElsewhere={reservedElsewhere}
                onAccept={handleAccept}
              />

              <button
                type="button"
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 mt-3 py-2 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartir propuesta
              </button>
            </div>

            {/* Booking lifecycle */}
            {booking && (
              <BookingPanel
                bookingId={booking.id}
                requestId={requestId}
                proposalId={proposal.id}
                bookingStatus={booking.status}
                hasReview={booking.hasReview}
                chefName={chef.name}
                serviceDate={serviceDate}
              />
            )}

            {/* Other proposals */}
            {otherProposals.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-5">
                <p className="text-sm text-zinc-700 font-medium mb-4 leading-snug">
                  Tienes otras propuestas de menú para tu solicitud
                </p>
                <div className="space-y-4">
                  {otherProposals.map((op) => (
                    <Link
                      key={op.id}
                      href={`/client-dashboard/${requestId}/proposals/${op.id}`}
                      onClick={() => setLoadingProposalId(op.id)}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0 ring-1 ring-zinc-200">
                        {op.photoUrl ? (
                          <Image src={op.photoUrl} alt={op.chefName} width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-bold">
                            {op.chefName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 group-hover:text-accent transition-colors truncate">
                          {op.chefName}
                        </p>
                        {op.price_per_person != null && (
                          <p className="text-xs text-zinc-500">
                            {formatPrice(op.price_per_person)} / persona
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-accent font-medium flex-shrink-0 flex items-center gap-1">
                        Ver propuesta
                        {loadingProposalId === op.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                        }
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
