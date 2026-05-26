"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CalendarDays, Users, MapPin,
  ChefHat, UtensilsCrossed, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { sendMessage, getMessages } from "@/app/dashboard/requests/[id]/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type RequestInfo = {
  status:           string
  service_type:     string
  event_date_start: string
  event_date_end:   string | null
  event_time:       string | null
  budget_min:       number | null
  budget_max:       number | null
  guests_adults:    number | null
  guests_teens:     number | null
  guests_kids:      number | null
  cuantas_personas: number | null
  occasion:         string | null
  location:         string | null
  cuisine_type:     string | null
}

type Proposal = {
  id:               string
  message:          string | null
  menu_description: string | null
  price_per_person: number | null
  status:           string
  created_at:       string
}

export type ChatMessage = {
  id:          string
  sender_id:   string
  sender_name: string
  content:     string
  is_read:     boolean
  sent_at:     string
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  single:   "Servicio único",
  multiple: "Múltiples servicios",
  weekly:   "Semanal",
};

const OCCASION_LABELS: Record<string, string> = {
  birthday:          "Cumpleaños",
  bachelor_party:    "Despedida de soltero/a",
  romantic_dinner:   "Cena romántica",
  gastronomic:       "Experiencia gastronómica",
  family_reunion:    "Reunión familiar",
  friends_gathering: "Reunión de amigos",
  corporate:         "Corporativo",
  other:             "Otro",
};

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Propuesta enviada",   color: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  accepted:  { label: "Propuesta aceptada",  color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:  { label: "Propuesta rechazada", color: "bg-red-50 text-red-700 border-red-200",             icon: <XCircle className="w-3 h-3" /> },
  withdrawn: { label: "Propuesta retirada",  color: "bg-zinc-100 text-zinc-600 border-zinc-200",        icon: null },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit",
  });
}

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ── Componente principal ───────────────────────────────────────────────────────

export function RequestChatView({
  proposalId,
  currentUserId,
  request,
  clientName,
  proposal,
  initialMessages,
}: {
  proposalId:      string
  currentUserId:   string
  request:         RequestInfo
  clientName:      string
  proposal:        Proposal
  initialMessages: ChatMessage[]
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const poll = async () => {
      const data = await getMessages(proposalId);
      if (data.length > 0) setMessages(data as ChatMessage[]);
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [proposalId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");

    // Optimistic insert
    const optimistic: ChatMessage = {
      id:          crypto.randomUUID(),
      sender_id:   currentUserId,
      sender_name: "Tú",
      content:     text,
      is_read:     false,
      sent_at:     new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const result = await sendMessage(proposalId, text);
      if (result.error) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(text);
        router.refresh();
      }
    });
  };

  // Guest summary
  const guestParts: string[] = [];
  if (request.guests_adults) guestParts.push(`${request.guests_adults} adulto${request.guests_adults !== 1 ? "s" : ""}`);
  if (request.guests_teens)  guestParts.push(`${request.guests_teens} adolescente${request.guests_teens !== 1 ? "s" : ""}`);
  if (request.guests_kids)   guestParts.push(`${request.guests_kids} niño${request.guests_kids !== 1 ? "s" : ""}`);
  const guestStr = guestParts.length > 0
    ? guestParts.join(", ")
    : request.cuantas_personas ? `${request.cuantas_personas} personas` : null;

  const dateStr = request.event_date_end && request.event_date_end !== request.event_date_start
    ? `${formatDate(request.event_date_start)} → ${formatDate(request.event_date_end)}`
    : formatDate(request.event_date_start);

  const proposalCfg = PROPOSAL_STATUS_CONFIG[proposal.status];

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-0px)] max-h-screen">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-zinc-200 px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/requests"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-zinc-900 text-sm truncate">{clientName}</h1>
            <p className="text-xs text-zinc-500">
              {SERVICE_TYPE_LABELS[request.service_type] ?? request.service_type} · {dateStr}
            </p>
          </div>
          {proposalCfg && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${proposalCfg.color}`}>
              {proposalCfg.icon}
              {proposalCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Request + Proposal summary card */}
        <div className="m-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Detalles del evento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
              {dateStr}{request.event_time && ` · ${request.event_time}`}
            </div>
            {guestStr && (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Users className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                {guestStr}
              </div>
            )}
            {request.occasion && (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <ChefHat className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                {OCCASION_LABELS[request.occasion] ?? request.occasion}
              </div>
            )}
            {request.cuisine_type && (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <UtensilsCrossed className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                <span className="capitalize">{request.cuisine_type.replace(/_/g, " ")}</span>
              </div>
            )}
            {request.location && (
              <div className="flex items-center gap-2 text-xs text-zinc-600 sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                {request.location}
              </div>
            )}
          </div>

          {/* Proposal summary */}
          {(proposal.menu_description || proposal.message || proposal.price_per_person) && (
            <>
              <div className="border-t border-zinc-200 pt-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Tu propuesta</p>
                {proposal.menu_description && (
                  <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {proposal.menu_description}
                  </pre>
                )}
                {proposal.price_per_person && (
                  <p className="text-xs text-zinc-600 mt-1.5 font-medium">
                    ${fmt(proposal.price_per_person)} por persona
                  </p>
                )}
                {proposal.message && (
                  <p className="text-xs text-zinc-500 mt-1.5 italic">{proposal.message}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="px-4 pb-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-6">
              Todavía no hay mensajes. ¡Iniciá la conversación!
            </p>
          ) : (
            messages.map((m) => {
              const isOwn = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
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
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-zinc-200 px-4 py-3">
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribí un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors max-h-32 overflow-y-auto"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
