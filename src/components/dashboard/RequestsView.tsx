"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays, Users, MapPin, ChefHat, UtensilsCrossed,
  Lock, SendHorizonal, Clock, CheckCircle2, XCircle, MessageCircle, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { submitProposal } from "@/app/dashboard/requests/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type MissingRequirement = {
  key:      string
  label:    string
  current:  number
  required: number
  href:     string
}

export type ChefMenu = {
  id:      string
  title:   string
  courses: { course: string; selection_mode: string }[]
  dishes:  { name: string; course: string }[]
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

const STATUS_COLORS: Record<string, string> = {
  new:        "bg-blue-50 text-blue-700 border-blue-200",
  in_process: "bg-amber-50 text-amber-700 border-amber-200",
  paid:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed:  "bg-zinc-100 text-zinc-600 border-zinc-200",
  cancelled:  "bg-red-50 text-red-700 border-red-200",
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

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null;
  if (min && max) return `$${fmt(min)} – $${fmt(max)}`;
  if (max) return `hasta $${fmt(max)}`;
  return `desde $${fmt(min!)}`;
}

// ── Gate de requisitos ─────────────────────────────────────────────────────────

function RequirementItem({ item }: { item: MissingRequirement }) {
  const pct = Math.min(100, Math.round((item.current / item.required) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-zinc-800">{item.label}</span>
        <span className="text-xs tabular-nums text-zinc-400">
          {item.current} / {item.required}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-200 rounded-full mb-2">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href={item.href}
        className="text-xs font-medium text-accent hover:underline underline-offset-2"
      >
        Completar →
      </Link>
    </div>
  );
}

function RequestsGate({ missing }: { missing: MissingRequirement[] }) {
  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Solicitudes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solicitudes de servicio que coinciden con tus preferencias.
        </p>
      </div>

      <div className="max-w-sm mx-auto text-center py-10">
        <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-zinc-400" />
        </div>
        <h2 className="font-semibold text-zinc-900 text-lg mb-2">
          Completá tu perfil para recibir solicitudes
        </h2>
        <p className="text-sm text-zinc-500 mb-8">
          Los clientes podrán encontrarte una vez que cumplas con los siguientes requisitos.
        </p>
        <div className="text-left space-y-6 bg-zinc-50 rounded-xl p-6 border border-zinc-200">
          {missing.map((item) => (
            <RequirementItem key={item.key} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Formulario de propuesta ────────────────────────────────────────────────────

function ProposalForm({ requestId, clientName, chefMenus, onSuccess, onClose }: {
  requestId:  string
  clientName: string
  chefMenus:  ChefMenu[]
  onSuccess:  () => void
  onClose:    () => void
}) {
  const [message, setMessage] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMenuSelect(menuId: string) {
    setSelectedMenuId(menuId);
    if (!menuId) { setMenuDescription(""); return; }
    const menu = chefMenus.find((m) => m.id === menuId);
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
        pricePerPerson ? parseFloat(pricePerPerson) : null,
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
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Mensaje al cliente <span className="text-zinc-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contale por qué sos la persona ideal para este evento..."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Descripción del menú
          </label>
          {chefMenus.length > 0 && (
            <select
              value={selectedMenuId}
              onChange={(e) => handleMenuSelect(e.target.value)}
              className="mb-2 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-zinc-700 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
            >
              <option value="">Elegir un menú para cargar...</option>
              {chefMenus.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          )}
          <textarea
            value={menuDescription}
            onChange={(e) => setMenuDescription(e.target.value)}
            placeholder="Describí los platos o la propuesta gastronómica..."
            rows={5}
            required
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none transition-colors"
          />
        </div>

        <div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Por persona <span className="text-zinc-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={pricePerPerson}
                onChange={(e) => setPricePerPerson(e.target.value)}
                placeholder="0"
                className="pl-6"
              />
            </div>
          </div>
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Enviando...
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
    <div className="border border-zinc-200 rounded-xl p-5 bg-white hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
          {STATUS_LABELS[req.status] ?? req.status}
        </span>
        <span className="text-xs text-zinc-400 flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {dateStr}
        </span>
      </div>

      <p className="font-semibold text-zinc-900 text-sm">{req.client_name}</p>
      <p className="text-xs text-zinc-500 mt-0.5 mb-3">
        {SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type}
        {req.event_time && <> · {req.event_time}</>}
        {budget && <> · <span className="font-medium text-zinc-700">{budget}</span></>}
      </p>

      <div className="space-y-1.5 mb-4">
        {guestStr && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{guestStr}</span>
          </div>
        )}
        {req.cuisine_type && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <UtensilsCrossed className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="capitalize">{req.cuisine_type.replace(/_/g, ' ')}</span>
          </div>
        )}
        {req.occasion && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ChefHat className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{OCCASION_LABELS[req.occasion] ?? req.occasion}</span>
          </div>
        )}
        {req.location && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{req.location}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
        {proposalCfg ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${proposalCfg.color}`}>
            {proposalCfg.icon}
            {proposalCfg.label}
          </span>
        ) : <span />}

        {proposalStatus ? (
          <button
            type="button"
            onClick={() => { setNavigating(true); router.push(`/dashboard/requests/${req.id}`); }}
            disabled={navigating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-70"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
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
}: {
  canReceive: boolean
  missing:    MissingRequirement[]
  requests:   RequestCard[]
  chefMenus:  ChefMenu[]
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

  if (!canReceive) {
    return <RequestsGate missing={missing} />;
  }

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Solicitudes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solicitudes de servicio que coinciden con tus preferencias.
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
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
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  active ? "bg-accent/10 text-accent" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay solicitudes en esta categoría.</p>
          {activeTab === "all" && (
            <p className="text-xs mt-1">
              Ajustá tu{" "}
              <Link href="/dashboard/request-settings" className="text-accent underline underline-offset-2">
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
