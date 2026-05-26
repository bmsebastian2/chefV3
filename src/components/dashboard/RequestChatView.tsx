"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CalendarDays, Users, MapPin,
  ChefHat, UtensilsCrossed, Clock, CheckCircle2, XCircle, ChevronDown,
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
  pending:   { label: "Enviada",   color: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  accepted:  { label: "Aceptada",  color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:  { label: "Rechazada", color: "bg-red-50 text-red-700 border-red-200",             icon: <XCircle className="w-3 h-3" /> },
  withdrawn: { label: "Retirada",  color: "bg-zinc-100 text-zinc-600 border-zinc-200",         icon: null },
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

// ── Info panel (sidebar + mobile dropdown) ─────────────────────────────────────

function InfoPanel({
  request, proposal, dateStr, guestStr,
}: {
  request:  RequestInfo
  proposal: Proposal
  dateStr:  string
  guestStr: string | null
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2.5">Evento</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-zinc-700">
            <CalendarDays className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
            <span>{dateStr}{request.event_time && <span className="text-zinc-400"> · {request.event_time}</span>}</span>
          </li>
          {guestStr && (
            <li className="flex items-center gap-2 text-sm text-zinc-700">
              <Users className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              {guestStr}
            </li>
          )}
          {request.occasion && (
            <li className="flex items-center gap-2 text-sm text-zinc-700">
              <ChefHat className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              {OCCASION_LABELS[request.occasion] ?? request.occasion}
            </li>
          )}
          {request.cuisine_type && (
            <li className="flex items-center gap-2 text-sm text-zinc-700">
              <UtensilsCrossed className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span className="capitalize">{request.cuisine_type.replace(/_/g, " ")}</span>
            </li>
          )}
          {request.location && (
            <li className="flex items-start gap-2 text-sm text-zinc-700">
              <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              {request.location}
            </li>
          )}
        </ul>
      </div>

      {(proposal.menu_description || proposal.message || proposal.price_per_person) && (
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2.5">Tu propuesta</p>
          <div className="space-y-2">
            {proposal.price_per_person && (
              <p className="text-xl font-bold text-zinc-900">
                ${fmt(proposal.price_per_person)}
                <span className="text-sm font-normal text-zinc-400"> /persona</span>
              </p>
            )}
            {proposal.menu_description && (
              <pre className="text-xs text-zinc-600 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-100 rounded-lg p-2.5">
                {proposal.menu_description}
              </pre>
            )}
            {proposal.message && (
              <p className="text-xs text-zinc-400 italic leading-relaxed">{proposal.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

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

  // Derived values
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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/requests"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-zinc-900 text-sm truncate">{clientName}</h1>
            <p className="text-xs text-zinc-400 truncate">
              {SERVICE_TYPE_LABELS[request.service_type] ?? request.service_type} · {dateStr}
            </p>
          </div>
          {proposalCfg && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${proposalCfg.color}`}>
              {proposalCfg.icon}
              {proposalCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex flex-col w-64 lg:w-72 flex-shrink-0 border-r border-zinc-200 overflow-y-auto bg-zinc-50/60">
          <InfoPanel request={request} proposal={proposal} dateStr={dateStr} guestStr={guestStr} />
        </aside>

        {/* Chat column */}
        <div className="flex flex-col flex-1 overflow-hidden bg-white">

          {/* Mobile: collapsible details */}
          <div className="md:hidden border-b border-zinc-100">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              <span className="font-medium text-zinc-600">Detalles del evento</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} />
            </button>
            {detailsOpen && (
              <div className="bg-zinc-50 border-t border-zinc-100">
                <InfoPanel request={request} proposal={proposal} dateStr={dateStr} guestStr={guestStr} />
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-center">
                <p className="text-sm text-zinc-400">Todavía no hay mensajes.</p>
                <p className="text-xs text-zinc-300">¡Iniciá la conversación!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isOwn = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                      {!isOwn && (
                        <span className="text-[11px] text-zinc-400 px-1">{m.sender_name}</span>
                      )}
                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isOwn
                          ? "bg-accent text-white rounded-br-[4px]"
                          : "bg-zinc-100 text-zinc-800 rounded-bl-[4px]"
                      }`}>
                        {m.content}
                      </div>
                      <span className="text-[11px] text-zinc-400 px-1">{formatTime(m.sent_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-white border-t border-zinc-100 px-4 py-3">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribí un mensaje..."
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                style={{ maxHeight: "128px", overflowY: "auto" }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isPending}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-accent text-white hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
