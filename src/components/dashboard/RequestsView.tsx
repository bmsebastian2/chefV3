"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays, Users, MapPin, ChefHat, UtensilsCrossed,
  Lock, SendHorizonal, Clock, CheckCircle2, XCircle,
  MessageCircle, Loader2, ArrowRight, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { submitProposal } from "@/app/dashboard/requests/actions";
import { formatPrice, formatPriceRange } from "@/lib/format";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type MissingRequirement = {
  key:      string
  label:    string
  current:  number
  required: number
  href:     string
}

export type ChefMenu = {
  id:        string
  title:     string
  courses:   { course: string; selection_mode: string }[]
  dishes:    { name: string; course: string }[]
  price_2:     number | null
  price_3_6:   number | null
  price_7_20:  number | null
}

export type RequestCard = {
  id:               string
  status:           string
  service_type:     string
  event_date_start: string
  event_date_end:   string | null
  event_time:       string | null
  budget_min:       number | null
  budget_max:       number | null
  cuantas_personas: number | null
  guests_adults:    number | null
  guests_teens:     number | null
  guests_kids:      number | null
  occasion:         string | null
  location:         string | null
  city:             string | null
  cuisine_type:     string | null
  client_name:      string
  proposal_status?: string | null
}

const STATUS_TABS = [
  { key: "all",        label: "Todos" },
  { key: "new",        label: "Nuevo" },
  { key: "in_process", label: "En proceso" },
  { key: "paid",       label: "Pagado" },
  { key: "completed",  label: "Completado" },
  { key: "cancelled",  label: "Cancelado" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  new:        "Nuevo",
  in_process: "En proceso",
  paid:       "Pagado",
  completed:  "Completado",
  cancelled:  "Cancelado",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  new:        "text-sky-600",
  in_process: "text-amber-600",
  paid:       "text-emerald-600",
  completed:  "text-zinc-500",
  cancelled:  "text-red-500",
};

const STATUS_DOT: Record<string, string> = {
  new:        "bg-sky-500",
  in_process: "bg-amber-500",
  paid:       "bg-emerald-500",
  completed:  "bg-zinc-400",
  cancelled:  "bg-red-400",
};

const STATUS_LEFT_BORDER: Record<string, string> = {
  new:        "border-l-sky-500",
  in_process: "border-l-amber-500",
  paid:       "border-l-emerald-500",
  completed:  "border-l-zinc-300",
  cancelled:  "border-l-red-300",
};

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

const COURSE_LABELS: Record<string, string> = {
  starter:      "Entrantes",
  first_course: "Primer plato",
  main:         "Principal",
  dessert:      "Postres",
};

const SELECTION_MODE_LABELS: Record<string, string> = {
  all_inclusive: "Todo incluido",
  choose_1:      "Elegir 1 plato",
  choose_2:      "Elegir 2 platos",
  choose_3:      "Elegir 3 platos",
};

const COURSE_ORDER = ["starter", "first_course", "main", "dessert"];

function priceForGuests(menu: ChefMenu, guests: number | null): number | null {
  if (guests === null) return null;
  if (guests <= 2)  return menu.price_2;
  if (guests <= 6)  return menu.price_3_6;
  return menu.price_7_20;
}

function buildMenuDescription(menu: ChefMenu): string {
  const sections: string[] = [];
  for (const course of COURSE_ORDER) {
    const dishes = menu.dishes.filter((d) => d.course === course);
    if (dishes.length === 0) continue;
    const setting = menu.courses.find((c) => c.course === course);
    const modeLabel = setting
      ? (SELECTION_MODE_LABELS[setting.selection_mode] ?? setting.selection_mode)
      : "Todo incluido";
    const heading = `${COURSE_LABELS[course] ?? course} (${modeLabel})`;
    const lines = dishes.map((d) => `• ${d.name}`);
    sections.push([heading, ...lines].join("\n"));
  }
  return sections.join("\n\n");
}

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Propuesta enviada",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  accepted: {
    label: "Propuesta aceptada",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejected: {
    label: "Propuesta rechazada",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  withdrawn: {
    label: "Propuesta retirada",
    color: "bg-zinc-100 text-zinc-600 border-zinc-200",
    icon: null,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null;
  if (min && max) return formatPriceRange(min, max);
  if (max) return `hasta ${formatPrice(max)}`;
  return `desde ${formatPrice(min!)}`;
}

function DetailRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-50 last:border-0">
      <span className="text-zinc-300 shrink-0">{icon}</span>
      <span className="text-xs text-zinc-500 truncate">{value}</span>
    </div>
  );
}

// ── Gate de requisitos ─────────────────────────────────────────────────────────

function RequirementItem({ item }: { item: MissingRequirement }) {
  const pct = Math.min(100, Math.round((item.current / item.required) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-800">{item.label}</span>
        <span className="text-xs font-mono tabular-nums text-zinc-400">
          {item.current} / {item.required}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full mb-2.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href={item.href}
        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
      >
        Completar
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function RequestsGate({ missing }: { missing: MissingRequirement[] }) {
  return (
    <div className="p-6 md:p-10">
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Chef dashboard
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Solicitudes</h1>
        <p className="text-sm text-zinc-500">
          Solicitudes de servicio que coinciden con tus preferencias.
        </p>
      </div>

      <div className="max-w-sm">
        <div className="flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-2xl mb-6">
          <Lock className="w-7 h-7 text-zinc-400" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-zinc-900 mb-2">
          Completá tu perfil para recibir solicitudes
        </h2>
        <p className="text-sm text-zinc-500 mb-7 leading-relaxed">
          Los clientes podrán encontrarte una vez que cumplas con los siguientes requisitos.
        </p>
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 space-y-6">
          {missing.map((item) => (
            <RequirementItem key={item.key} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Bloqueo administrativo: el chef no puede operar y no puede revertirlo. Mensaje
// claro que lo deriva al admin (estado distinto al de "perfil incompleto").
function RequestsBlocked() {
  return (
    <div className="p-6 md:p-10">
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Chef dashboard
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Solicitudes</h1>
      </div>

      <div className="max-w-md">
        <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
          <Lock className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-zinc-900 mb-2">
          Tu cuenta está deshabilitada
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          La administración deshabilitó tu cuenta, así que por ahora no recibís solicitudes ni podés
          enviar propuestas. Escribinos para resolverlo y reactivar tu cuenta.
        </p>
        <a
          href="mailto:hola@getchef.com"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contactar a la administración
        </a>
      </div>
    </div>
  );
}

// ── Formulario de propuesta ────────────────────────────────────────────────────

function ProposalForm({ requestId, clientName, chefMenus, guestCount, onSuccess, onClose }: {
  requestId:  string
  clientName: string
  chefMenus:  ChefMenu[]
  guestCount: number | null
  onSuccess:  () => void
  onClose:    () => void
}) {
  const [message, setMessage] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<ChefMenu | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMenuSelect(menuId: string) {
    setSelectedMenuId(menuId);
    if (!menuId) { setMenuDescription(""); setSelectedMenu(null); return; }
    const menu = chefMenus.find((m) => m.id === menuId) ?? null;
    setSelectedMenu(menu);
    if (menu) setMenuDescription(buildMenuDescription(menu));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!menuDescription.trim()) { setServerError('La descripción del menú es obligatoria.'); return; }
    startTransition(async () => {
      const result = await submitProposal(
        requestId,
        message.trim() || null,
        menuDescription.trim(),
        null,
        selectedMenu ? priceForGuests(selectedMenu, guestCount) : null,
      );
      if (result.error) {
        setServerError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>Enviar propuesta</DialogTitle>
        <DialogDescription>Para: {clientName}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
            Descripción del menú <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          {chefMenus.length > 0 && (
            <div className="relative mb-2">
              <select
                value={selectedMenuId}
                onChange={(e) => handleMenuSelect(e.target.value)}
                className="w-full h-10 appearance-none px-4 pr-10 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent transition-all duration-150 cursor-pointer"
              >
                <option value="">Elegir un menú para cargar…</option>
                {chefMenus.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          <textarea
            value={menuDescription}
            onChange={(e) => setMenuDescription(e.target.value)}
            placeholder="Describí los platos o la propuesta gastronómica..."
            rows={5}
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 mb-2">
            Mensaje al cliente{" "}
            <span className="text-zinc-400 normal-case tracking-normal font-normal">(opcional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contale por qué sos la persona ideal para este evento..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent resize-none transition-all duration-150"
          />
        </div>

        {selectedMenu && (selectedMenu.price_2 || selectedMenu.price_3_6 || selectedMenu.price_7_20) && (() => {
          const activePrice = priceForGuests(selectedMenu, guestCount);
          const row = (label: string, price: number | null, isActive: boolean) =>
            price != null ? (
              <div className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 -mx-1 ${isActive ? "bg-accent/10 ring-1 ring-accent/20" : ""}`}>
                <span className={isActive ? "text-accent font-medium text-xs" : "text-zinc-600 text-xs"}>
                  {label}{isActive && guestCount !== null ? ` (${guestCount})` : ""}
                </span>
                <span className={`font-semibold text-xs ${isActive ? "text-accent" : "text-zinc-900"}`}>
                  {formatPrice(price)}
                </span>
              </div>
            ) : null;
          return (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-2.5">
                Precios del menú (por persona)
              </p>
              <div className="space-y-0.5">
                {row("2 personas",    selectedMenu.price_2,    activePrice === selectedMenu.price_2    && selectedMenu.price_2    != null)}
                {row("3–6 personas",  selectedMenu.price_3_6,  activePrice === selectedMenu.price_3_6  && selectedMenu.price_3_6  != null)}
                {row("7–20 personas", selectedMenu.price_7_20, activePrice === selectedMenu.price_7_20 && selectedMenu.price_7_20 != null)}
              </div>
            </div>
          );
        })()}
      </div>

      {serverError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 hover:shadow-md hover:shadow-accent/20 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <SendHorizonal className="w-3.5 h-3.5" />
              Enviar propuesta
            </>
          )}
        </button>
      </DialogFooter>
    </form>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function RequestCardItem({ req, chefMenus }: { req: RequestCard; chefMenus: ChefMenu[] }) {
  const [proposalStatus, setProposalStatus] = useState<string | null>(req.proposal_status ?? null);
  const [showProposal, setShowProposal] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  const budget  = formatBudget(req.budget_min, req.budget_max);
  const dateStr = req.event_date_end && req.event_date_end !== req.event_date_start
    ? `${formatDate(req.event_date_start)} → ${formatDate(req.event_date_end)}`
    : formatDate(req.event_date_start);

  const guestParts: string[] = [];
  if (req.guests_adults) guestParts.push(`${req.guests_adults} adulto${req.guests_adults !== 1 ? 's' : ''}`);
  if (req.guests_teens)  guestParts.push(`${req.guests_teens} adolescente${req.guests_teens !== 1 ? 's' : ''}`);
  if (req.guests_kids)   guestParts.push(`${req.guests_kids} niño${req.guests_kids !== 1 ? 's' : ''}`);
  const guestStr = guestParts.length > 0
    ? guestParts.join(', ')
    : req.cuantas_personas ? `${req.cuantas_personas} personas` : null;

  const proposalCfg = proposalStatus ? PROPOSAL_STATUS_CONFIG[proposalStatus] : null;
  const canApply = req.status === 'new' && !proposalStatus;

  return (
    <div
      className={[
        "relative bg-white border border-zinc-100 border-l-4 rounded-xl overflow-hidden",
        STATUS_LEFT_BORDER[req.status] ?? "border-l-zinc-200",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        req.status === "cancelled" ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* Top */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 ${STATUS_TEXT_COLORS[req.status] ?? "text-zinc-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[req.status] ?? "bg-zinc-400"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
          </span>
          <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0">
            <CalendarDays className="w-3 h-3" />
            {dateStr}
          </span>
        </div>

        <p className="font-serif text-[15px] font-semibold text-zinc-900 leading-snug">
          {req.client_name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type}
          {req.event_time && <> · {req.event_time}</>}
          {budget && <> · <span className="font-medium text-zinc-700">{budget}</span></>}
        </p>
      </div>

      {/* Detail rows */}
      <div className="border-t border-zinc-50 px-4 py-2">
        {guestStr && (
          <DetailRow icon={<Users className="w-3 h-3" />} value={guestStr} />
        )}
        {req.cuisine_type && (
          <DetailRow icon={<UtensilsCrossed className="w-3 h-3" />} value={req.cuisine_type.replace(/_/g, ' ')} />
        )}
        {req.occasion && (
          <DetailRow icon={<ChefHat className="w-3 h-3" />} value={OCCASION_LABELS[req.occasion] ?? req.occasion} />
        )}
        {req.location && (
          <DetailRow icon={<MapPin className="w-3 h-3" />} value={req.location} />
        )}
      </div>

      {/* Action footer */}
      <div className="border-t border-zinc-50 px-4 py-3 flex items-center justify-between gap-2">
        {proposalCfg ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${proposalCfg.color}`}>
            {proposalCfg.icon}
            {proposalCfg.label}
          </span>
        ) : <span />}

        {proposalStatus ? (
          <button
            type="button"
            onClick={() => { setNavigating(true); router.push(`/dashboard/requests/${req.id}`); }}
            disabled={navigating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-60"
          >
            {navigating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <MessageCircle className="w-3.5 h-3.5" />}
            Chat
          </button>
        ) : canApply ? (
          <>
            <button
              type="button"
              onClick={() => setShowProposal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 hover:shadow-sm hover:shadow-accent/20 transition-all duration-150"
            >
              <SendHorizonal className="w-3.5 h-3.5" />
              Postularse
            </button>
            <Dialog open={showProposal} onOpenChange={setShowProposal}>
              <DialogContent>
                <ProposalForm
                  requestId={req.id}
                  clientName={req.client_name}
                  chefMenus={chefMenus}
                  guestCount={
                    req.cuantas_personas ??
                    (((req.guests_adults ?? 0) + (req.guests_teens ?? 0) + (req.guests_kids ?? 0)) || null)
                  }
                  onSuccess={() => setProposalStatus('pending')}
                  onClose={() => setShowProposal(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────

export function RequestsView({
  canReceive,
  missing,
  requests,
  chefMenus,
  blocked = false,
}: {
  canReceive: boolean
  missing:    MissingRequirement[]
  requests:   RequestCard[]
  chefMenus:  ChefMenu[]
  blocked?:   boolean
}) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!canReceive) return;

    const refresh = () => startTransition(() => router.refresh());

    refresh();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(refresh, 30_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReceive]);

  if (blocked) {
    return <RequestsBlocked />;
  }

  if (!canReceive) {
    return <RequestsGate missing={missing} />;
  }

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-px w-8 bg-accent rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Chef dashboard
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-zinc-900 mb-2">Solicitudes</h1>
        <p className="text-sm text-zinc-500">
          Solicitudes de servicio que coinciden con tus preferencias.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-zinc-100 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "all"
            ? requests.length
            : requests.filter((r) => r.status === tab.key).length;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px",
                "text-xs font-bold uppercase tracking-[0.1em] transition-all duration-150",
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-zinc-400 hover:text-zinc-700",
              ].join(" ")}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-accent/10 text-accent" : "bg-zinc-100 text-zinc-400"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ChefHat className="w-7 h-7 text-zinc-300" />
          </div>
          <p className="text-sm font-medium text-zinc-500 mb-1">
            No hay solicitudes en esta categoría.
          </p>
          {activeTab === "all" && (
            <p className="text-xs text-zinc-400">
              Ajustá tu{" "}
              <Link
                href="/dashboard/request-settings"
                className="text-accent font-medium hover:text-accent/80 underline underline-offset-2 transition-colors"
              >
                configuración de solicitudes
              </Link>{" "}
              para ver más resultados.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <RequestCardItem key={req.id} req={req} chefMenus={chefMenus} />
          ))}
        </div>
      )}
    </div>
  );
}
