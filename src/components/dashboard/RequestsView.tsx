"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Users, MapPin, ChefHat, AlertCircle, UtensilsCrossed } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────

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
  birthday:         "Cumpleaños",
  bachelor_party:   "Despedida de soltero/a",
  romantic_dinner:  "Cena romántica",
  gastronomic:      "Experiencia gastronómica",
  family_reunion:   "Reunión familiar",
  friends_gathering:"Reunión de amigos",
  corporate:        "Corporativo",
  other:            "Otro",
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

// ── Card ───────────────────────────────────────────────────────────────────────

function RequestCardItem({ req }: { req: RequestCard }) {
  const budget  = formatBudget(req.budget_min, req.budget_max);
  const dateStr = req.event_date_end && req.event_date_end !== req.event_date_start
    ? `${formatDate(req.event_date_start)} → ${formatDate(req.event_date_end)}`
    : formatDate(req.event_date_start);

  const guestParts: string[] = [];
  if (req.guests_adults) guestParts.push(`${req.guests_adults} adulto${req.guests_adults !== 1 ? 's' : ''}`);
  if (req.guests_teens)  guestParts.push(`${req.guests_teens} adolescente${req.guests_teens !== 1 ? 's' : ''}`);
  if (req.guests_kids)   guestParts.push(`${req.guests_kids} niño${req.guests_kids !== 1 ? 's' : ''}`);
  const guestStr = guestParts.length > 0 ? guestParts.join(', ') : req.cuantas_personas ? `${req.cuantas_personas} personas` : null;

  return (
    <Link
      href={`/dashboard/requests/${req.id}`}
      className="block border border-zinc-200 rounded-xl p-5 bg-white hover:border-accent/40 hover:shadow-sm transition-all"
    >
      {/* Status + date */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[req.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
          {STATUS_LABELS[req.status] ?? req.status}
        </span>
        <span className="text-xs text-zinc-400 flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {dateStr}
        </span>
      </div>

      {/* Client name */}
      <p className="font-semibold text-zinc-900 text-sm">{req.client_name}</p>
      <p className="text-xs text-zinc-500 mt-0.5 mb-3">
        {SERVICE_TYPE_LABELS[req.service_type] ?? req.service_type}
        {req.event_time && <> · {req.event_time}</>}
        {budget && <> · <span className="font-medium text-zinc-700">{budget}</span></>}
      </p>

      {/* Details */}
      <div className="space-y-1.5">
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
    </Link>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────

export function RequestsView({
  requests,
  profileComplete,
}: {
  requests:        RequestCard[]
  profileComplete: boolean
}) {
  const [activeTab, setActiveTab] = useState<string>("all");

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Solicitudes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solicitudes de servicio que coinciden con tus preferencias.
        </p>
      </div>

      {/* Profile incomplete banner */}
      {!profileComplete && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Completá tu perfil para que los clientes puedan encontrarte.{" "}
            <Link href="/dashboard" className="font-semibold underline underline-offset-2">
              Ver progreso
            </Link>
          </span>
        </div>
      )}

      {/* Tabs */}
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

      {/* Grid de cards */}
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
            <RequestCardItem key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}
