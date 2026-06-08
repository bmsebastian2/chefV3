"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CalendarDays, Users, MapPin,
  ChefHat, UtensilsCrossed, Clock, CheckCircle2, XCircle, ChevronDown,
  MessageCircle,
} from "lucide-react";
import { sendMessage, getMessages } from "@/app/dashboard/requests/[id]/actions";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Dictionaries ───────────────────────────────────────────────────────────────

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

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string; bd: string; Icon: React.ElementType }> = {
  pending:   { label: "Enviada",   bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A", Icon: Clock },
  accepted:  { label: "Aceptada",  bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0", Icon: CheckCircle2 },
  rejected:  { label: "Rechazada", bg: "#FEF2F2", fg: "#DC2626", bd: "#FECACA", Icon: XCircle },
  withdrawn: { label: "Retirada",  bg: "#F4F4F5", fg: "#71717A", bd: "#D4D4D8", Icon: Clock },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ name, sm }: { name: string; sm?: boolean }) {
  const sz = sm ? 30 : 38;
  const fs = sm ? 11 : 14;
  return (
    <div style={{
      width: sz, height: sz, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #D97706 0%, #92400E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: fs, fontWeight: 600,
      boxShadow: "0 2px 8px rgba(146,64,14,.22)", letterSpacing: ".03em",
    }}>
      {initials(name)}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #D4C0A0)" }} />
      <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "#A08060", fontWeight: 600, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #D4C0A0)" }} />
    </div>
  );
}

function InfoPanel({ request, proposal, dateStr, guestStr }: {
  request: RequestInfo; proposal: Proposal; dateStr: string; guestStr: string | null;
}) {
  return (
    <div style={{ padding: "20px 16px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <SectionDivider label="Evento" />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        <li style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#44403C", lineHeight: "1.45" }}>
          <CalendarDays style={{ width: 14, height: 14, color: "#A0896B", flexShrink: 0, marginTop: 1 }} />
          <span>{dateStr}{request.event_time && <span style={{ color: "#A0896B" }}> · {request.event_time}</span>}</span>
        </li>
        {guestStr && (
          <li style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#44403C" }}>
            <Users style={{ width: 14, height: 14, color: "#A0896B", flexShrink: 0 }} />
            {guestStr}
          </li>
        )}
        {request.occasion && (
          <li style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#44403C" }}>
            <ChefHat style={{ width: 14, height: 14, color: "#A0896B", flexShrink: 0 }} />
            {OCCASION_LABELS[request.occasion] ?? request.occasion}
          </li>
        )}
        {request.cuisine_type && (
          <li style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#44403C" }}>
            <UtensilsCrossed style={{ width: 14, height: 14, color: "#A0896B", flexShrink: 0 }} />
            <span style={{ textTransform: "capitalize" }}>{request.cuisine_type.replace(/_/g, " ")}</span>
          </li>
        )}
        {request.location && (
          <li style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#44403C", lineHeight: "1.45" }}>
            <MapPin style={{ width: 14, height: 14, color: "#A0896B", flexShrink: 0, marginTop: 1 }} />
            {request.location}
          </li>
        )}
      </ul>

      {(proposal.price_per_person || proposal.menu_description || proposal.message) && (
        <div style={{ marginTop: 22 }}>
          <SectionDivider label="Tu propuesta" />
          <div style={{
            background: "rgba(255,255,255,.75)", borderRadius: 12,
            border: "1px solid rgba(212,196,160,.55)", padding: 14,
            backdropFilter: "blur(4px)",
          }}>
            {proposal.price_per_person && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#1C1917" }}>
                  ${fmt(proposal.price_per_person)}
                </span>
                <span style={{ fontSize: 12, color: "#A0896B", marginLeft: 4 }}>/persona</span>
              </div>
            )}
            {proposal.menu_description && (
              <pre style={{
                fontSize: 11.5, color: "#57534E", whiteSpace: "pre-wrap",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                lineHeight: "1.6", margin: 0, padding: 10,
                background: "#FAF7F2", borderRadius: 8, border: "1px solid #EDE8DC",
              }}>
                {proposal.menu_description}
              </pre>
            )}
            {proposal.message && (
              <p style={{ fontSize: 11.5, color: "#78716C", fontStyle: "italic", lineHeight: "1.5", marginTop: 8, marginBottom: 0 }}>
                &ldquo;{proposal.message}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RequestChatView({
  proposalId, currentUserId, request, clientName, proposal, initialMessages,
}: {
  proposalId:      string
  currentUserId:   string
  request:         RequestInfo
  clientName:      string
  proposal:        Proposal
  initialMessages: ChatMessage[]
}) {
  const [messages, setMessages]       = useState<ChatMessage[]>(initialMessages);
  const [input, setInput]             = useState("");
  const [isPending, startTransition]  = useTransition();
  const [error, setError]             = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
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
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
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
      id: crypto.randomUUID(), sender_id: currentUserId, sender_name: "Tú",
      content: text, is_read: false, sent_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    startTransition(async () => {
      const result = await sendMessage(proposalId, text);
      if (result.error) {
        setError(result.error);
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setInput(text);
        router.refresh();
      }
    });
  };

  // Derived
  const guestParts: string[] = [];
  if (request.guests_adults) guestParts.push(`${request.guests_adults} adulto${request.guests_adults !== 1 ? "s" : ""}`);
  if (request.guests_teens)  guestParts.push(`${request.guests_teens} adolescente${request.guests_teens !== 1 ? "s" : ""}`);
  if (request.guests_kids)   guestParts.push(`${request.guests_kids} niño${request.guests_kids !== 1 ? "s" : ""}`);
  const guestStr = guestParts.length > 0 ? guestParts.join(", ")
    : request.cuantas_personas ? `${request.cuantas_personas} personas` : null;
  const dateStr = request.event_date_end && request.event_date_end !== request.event_date_start
    ? `${formatDate(request.event_date_start)} → ${formatDate(request.event_date_end)}`
    : formatDate(request.event_date_start);
  const cfg = STATUS_CFG[proposal.status];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');

        .gchat { font-family: 'DM Sans', system-ui, sans-serif; }

        @keyframes gcMsgR { from { opacity: 0; transform: translateX(12px) scale(.95); } to { opacity: 1; transform: none; } }
        @keyframes gcMsgL { from { opacity: 0; transform: translateX(-12px) scale(.95); } to { opacity: 1; transform: none; } }
        @keyframes gcFade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gcDown  { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

        .gchat-msg-own   { animation: gcMsgR .22s cubic-bezier(.34,1.56,.64,1) both; }
        .gchat-msg-other { animation: gcMsgL .22s cubic-bezier(.34,1.56,.64,1) both; }
        .gchat-fade      { animation: gcFade .35s ease both; }
        .gchat-down      { animation: gcDown .25s ease both; }

        .gchat-scroll::-webkit-scrollbar       { width: 3px; }
        .gchat-scroll::-webkit-scrollbar-track { background: transparent; }
        .gchat-scroll::-webkit-scrollbar-thumb { background: #DDD8D0; border-radius: 2px; }

        .gchat-input::placeholder { color: #C0B4A8; }
        .gchat-input:focus {
          outline: none;
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent) !important;
        }

        .gchat-send { transition: transform .12s ease, box-shadow .12s ease, opacity .15s ease; }
        .gchat-send:not(:disabled):hover  { transform: scale(1.07); box-shadow: 0 4px 14px rgba(0,0,0,.2); }
        .gchat-send:not(:disabled):active { transform: scale(.95); }

        .gchat-back { transition: background .15s ease; }
        .gchat-back:hover { background: #F5EFE5 !important; }

        .gchat-toggle { transition: background .15s ease; }
        .gchat-toggle:hover { background: #F7F2E8 !important; }
      `}</style>

      <div
        className="gchat"
        style={{ display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#FAFAF7" }}
      >

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header style={{
          flexShrink: 0, background: "#fff",
          borderBottom: "1px solid #EFE8DC",
          padding: "11px 16px",
          boxShadow: "0 1px 6px rgba(160,140,100,.07)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Link
              href="/dashboard/requests"
              className="gchat-back"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid #EDE8DC", color: "#78716C", textDecoration: "none",
              }}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} />
            </Link>

            <Avatar name={clientName} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 15, fontWeight: 600, color: "#1C1917",
                margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {clientName}
              </h1>
              <p style={{ fontSize: 11, color: "#A0896B", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {SERVICE_TYPE_LABELS[request.service_type] ?? request.service_type}
                <span style={{ margin: "0 5px", color: "#D4C4A0" }}>·</span>
                {dateStr}
              </p>
            </div>

            {cfg && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 20, flexShrink: 0,
                background: cfg.bg, color: cfg.fg, fontSize: 11, fontWeight: 600,
                border: `1px solid ${cfg.bd}`,
              }}>
                <cfg.Icon style={{ width: 11, height: 11 }} />
                {cfg.label}
              </div>
            )}
          </div>
        </header>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Sidebar — desktop only */}
          <aside
            className="gchat-scroll hidden md:flex"
            style={{
              flexDirection: "column", flexShrink: 0, width: 256,
              borderRight: "1px solid #EDE8DC", overflowY: "auto",
              background: "linear-gradient(170deg, #FAF7F0 0%, #F4EFE3 100%)",
              position: "relative",
            }}
          >
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 1,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23A0896B' fill-opacity='.07'/%3E%3C/svg%3E\")",
            }} />
            <InfoPanel request={request} proposal={proposal} dateStr={dateStr} guestStr={guestStr} />
          </aside>

          {/* Chat column */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

            {/* Mobile: collapsible details */}
            <div className="md:hidden" style={{ borderBottom: "1px solid #EDE8DC" }}>
              <button
                type="button"
                onClick={() => setDetailsOpen(v => !v)}
                className="gchat-toggle"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "linear-gradient(135deg, #D97706, #92400E)" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: "#78716C", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Detalles del evento
                  </span>
                </div>
                <ChevronDown style={{
                  width: 13, height: 13, color: "#A0896B",
                  transform: detailsOpen ? "rotate(180deg)" : "none",
                  transition: "transform .22s ease",
                }} />
              </button>
              {detailsOpen && (
                <div
                  className="gchat-down"
                  style={{ background: "linear-gradient(170deg, #FAF7F0, #F4EFE3)", borderTop: "1px solid #EDE8DC" }}
                >
                  <InfoPanel request={request} proposal={proposal} dateStr={dateStr} guestStr={guestStr} />
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              className="gchat-scroll"
              style={{ flex: 1, overflowY: "auto", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 5 }}
            >
              {messages.length === 0 ? (
                <div
                  className="gchat-fade"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, textAlign: "center" }}
                >
                  <div style={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: "linear-gradient(135deg, #FEF9EC, #FDF0C8)",
                    border: "2px solid #EDE8DC",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 6px 20px rgba(180,140,60,.13)",
                  }}>
                    <MessageCircle style={{ width: 26, height: 26, color: "#C4A060" }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 500, color: "#44403C", margin: "0 0 5px" }}>
                      Sin mensajes aún
                    </p>
                    <p style={{ fontSize: 12, color: "#A8A29E", margin: 0 }}>
                      Iniciá la conversación con {clientName.split(" ")[0]}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => {
                  const own = m.sender_id === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={own ? "gchat-msg-own" : "gchat-msg-other"}
                      style={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start", animationDelay: `${Math.min(i * 0.025, 0.12)}s` }}
                    >
                      {!own && <Avatar name={m.sender_name} sm />}
                      <div style={{
                        maxWidth: "68%", display: "flex", flexDirection: "column",
                        gap: 3, alignItems: own ? "flex-end" : "flex-start",
                        marginLeft: !own ? 7 : 0,
                      }}>
                        {!own && (
                          <span style={{ fontSize: 10, color: "#A0896B", paddingLeft: 2, fontWeight: 500, letterSpacing: ".01em" }}>
                            {m.sender_name}
                          </span>
                        )}
                        <div style={{
                          padding: "9px 13px",
                          borderRadius: own ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          fontSize: 13.5, lineHeight: "1.45", wordBreak: "break-word",
                          ...(own
                            ? { background: "var(--accent)", color: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.12)" }
                            : { background: "#fff", color: "#1C1917", border: "1px solid #EDE8DC", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }
                          ),
                        }}>
                          {m.content}
                        </div>
                        <span style={{ fontSize: 10, color: "#C4BAB2", padding: "0 2px" }}>
                          {formatTime(m.sent_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              flexShrink: 0, background: "#fff",
              borderTop: "1px solid #EDE8DC",
              padding: "11px 14px 14px",
              boxShadow: "0 -1px 8px rgba(160,140,100,.06)",
            }}>
              {error && <p style={{ fontSize: 11.5, color: "#DC2626", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{error}</p>}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Escribí un mensaje..."
                  rows={1}
                  className="gchat-input"
                  style={{
                    flex: 1, resize: "none", borderRadius: 16,
                    border: "1.5px solid #EDE8DC", background: "#FAF9F7",
                    padding: "9px 13px", fontSize: 13.5,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: "#1C1917", maxHeight: 128, overflowY: "auto",
                    lineHeight: "1.45", transition: "border-color .15s, box-shadow .15s",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isPending}
                  className="gchat-send"
                  style={{
                    width: 42, height: 42, flexShrink: 0, borderRadius: 13,
                    background: "var(--accent)", border: "none",
                    cursor: !input.trim() || isPending ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", opacity: !input.trim() || isPending ? 0.3 : 1,
                  }}
                >
                  <Send style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <p style={{ fontSize: 10, color: "#D0C4B4", marginTop: 5, marginBottom: 0, textAlign: "center" }}>
                Enter · enviar &nbsp;·&nbsp; Shift+Enter · nueva línea
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
