"use client";

import { useState } from "react";
import { MapPin, Users, Sun, Moon, CalendarDays, PartyPopper, UtensilsCrossed, Sparkles, Salad, Repeat, ChevronDown, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { WizardData } from "./types";

// Etiquetas legibles — mismo mapeo que usa StepContact1 (Steps.tsx)
const OCCASION_LABELS: Record<string, string> = {
  birthday: "Cumpleaños", family_reunion: "Reunión familiar",
  bachelor_party: "Despedida", friends_gathering: "Reunión con amigos",
  romantic_dinner: "Cena romántica", corporate: "Corporativo",
  gastronomic: "Aventura gastronómica", other: "Otra",
};

const CUISINE_LABELS: Record<string, string> = {
  local: "Local", italian: "Italiana", mediterranean: "Mediterránea",
  seafood: "Mariscos", french: "Francesa", japanese: "Japonesa",
  fusion: "Fusión", chefs_special: "Especial del chef",
};

// Forma "dentro de la frase" de cada cocina, para la oración de cabecera
// ("Cena de mariscos…", "Comida italiana…").
const CUISINE_PHRASE: Record<string, string> = {
  local: "local", italian: "italiana", mediterranean: "mediterránea",
  seafood: "de mariscos", french: "francesa", japanese: "japonesa",
  fusion: "fusión", chefs_special: "del chef",
};

const TIER_LABELS: Record<string, string> = {
  casual: "Casual", gourmet: "Gourmet", exclusive: "Selección exclusiva",
};

interface SummaryItem {
  key: string;
  Icon: LucideIcon;
  label: string;
  /** undefined = el paso todavía no se respondió (se muestra como pendiente) */
  value?: string;
}

// Slots del pedido por servicio. Misma derivación de valores que los chips
// anteriores; la diferencia es que el slot existe aunque falte el dato.
function buildItems(data: WizardData): SummaryItem[] {
  const items: SummaryItem[] = [];
  const isService2 = data.serviceType === "2";
  const isService3 = data.serviceType === "3";

  items.push({ key: "location", Icon: MapPin, label: "Ubicación", value: data.location?.city || undefined });

  // Ocasión: servicio 1 guarda claves; servicio 2 guarda el texto directo.
  // El servicio 3 (semanal) no tiene ocasión.
  if (!isService3)
    items.push({
      key: "occasion",
      Icon: PartyPopper,
      label: "Ocasión",
      value: data.occasion
        ? (isService2 ? data.occasion : OCCASION_LABELS[data.occasion] ?? data.occasion)
        : undefined,
    });

  if (isService3) {
    // Servicio 3 — comidas semanales
    const wd = data.weeklyDetails;
    items.push({
      key: "meals", Icon: UtensilsCrossed, label: "Comidas",
      value: wd?.comidasPorSemana !== undefined ? `${wd.comidasPorSemana} por semana` : undefined,
    });

    const r = wd?.racionesPorComida;
    items.push({
      key: "guests", Icon: Users, label: "Personas",
      value: r !== undefined ? `${r} ${r === 1 ? "persona" : "personas"}` : undefined,
    });

    const dias = wd?.frecuenciaCocina ?? [];
    items.push({
      key: "freq", Icon: Repeat, label: "Frecuencia",
      value: dias.length ? `${dias.length} ${dias.length === 1 ? "día" : "días"}/sem` : undefined,
    });

    items.push({
      key: "start", Icon: CalendarDays, label: "Inicio",
      value: data.date ? `Desde ${format(new Date(data.date), "d MMM", { locale: es })}` : undefined,
    });
  } else if (isService2) {
    // Rango de fechas
    let rango: string | undefined;
    if (data.dateRangeStart && data.dateRangeEnd) {
      const ini = format(new Date(data.dateRangeStart), "d MMM", { locale: es });
      const fin = format(new Date(data.dateRangeEnd), "d MMM", { locale: es });
      rango = ini === fin ? ini : `${ini} – ${fin}`;
    }
    items.push({ key: "dateRange", Icon: CalendarDays, label: "Fechas", value: rango });

    // Comidas seleccionadas (suma de desayuno/almuerzo/cena en todos los días)
    const totalComidas = (data.mealSlots ?? []).reduce(
      (n, s) => n + (s.desayuno ? 1 : 0) + (s.almuerzo ? 1 : 0) + (s.cena ? 1 : 0),
      0,
    );
    items.push({
      key: "meals", Icon: UtensilsCrossed, label: "Comidas",
      value: totalComidas > 0 ? `${totalComidas} en total` : undefined,
    });

    // Personas (adultos + adolescentes + niños)
    let invitados: string | undefined;
    if (data.guestsAdults !== undefined) {
      const total = (data.guestsAdults ?? 0) + (data.guestsTeens ?? 0) + (data.guestsKids ?? 0);
      invitados = `${total} ${total === 1 ? "persona" : "personas"}`;
    }
    items.push({ key: "guests", Icon: Users, label: "Invitados", value: invitados });
  } else {
    // Servicio 1 — número exacto de personas (flujo unificado)
    items.push({
      key: "guests", Icon: Users, label: "Invitados",
      value: data.guestsAdults !== undefined
        ? `${data.guestsAdults} ${data.guestsAdults === 1 ? "persona" : "personas"}`
        : undefined,
    });

    items.push({
      key: "mealTime",
      Icon: data.mealTime === "dinner" ? Moon : Sun,
      label: "Momento",
      value: data.mealTime ? (data.mealTime === "dinner" ? "Cena" : "Comida") : undefined,
    });

    items.push({
      key: "cuisine", Icon: UtensilsCrossed, label: "Cocina",
      value: data.cuisine ? CUISINE_LABELS[data.cuisine] ?? data.cuisine : undefined,
    });

    items.push({
      key: "date", Icon: CalendarDays, label: "Fecha",
      value: data.date ? format(new Date(data.date), "d MMM", { locale: es }) : undefined,
    });
  }

  // Presupuesto / tipo de propuesta (servicios 1 y 2 — ambos usan budgetTier)
  if (!isService3)
    items.push({
      key: "budget", Icon: Sparkles, label: "Propuesta",
      value: data.budgetTier ? TIER_LABELS[data.budgetTier] ?? data.budgetTier : undefined,
    });

  // Restricciones: ["Ninguna"] | ["Sí", ...reales] | ["Sí"]
  const restricciones = data.dietaryRestrictions ?? [];
  const restriccionesReales = restricciones.filter((r) => r !== "Sí" && r !== "Ninguna");
  const restriccionValue = restricciones[0] === "Ninguna"
    ? "Sin restricciones"
    : (restriccionesReales.length ? restriccionesReales.join(", ") : undefined);
  items.push({ key: "dietary", Icon: Salad, label: "Restricciones", value: restriccionValue });

  return items;
}

// Oración de cabecera: el pedido leído como una experiencia que se redacta
// en vivo ("Cena italiana para 4 en Managua").
function buildHeadline(data: WizardData): string {
  const city = data.location?.city ? ` en ${data.location.city}` : "";

  if (data.serviceType === "3") {
    const r = data.weeklyDetails?.racionesPorComida;
    return `Comidas semanales${r !== undefined ? ` para ${r}` : ""}${city}`;
  }

  if (data.serviceType === "2") {
    const total = data.guestsAdults !== undefined
      ? (data.guestsAdults ?? 0) + (data.guestsTeens ?? 0) + (data.guestsKids ?? 0)
      : undefined;
    const base = data.occasion || "Experiencia de varios días";
    return `${base}${total !== undefined ? ` para ${total}` : ""}${city}`;
  }

  // Servicio 1
  if (!data.mealTime && !data.cuisine && data.guestsAdults === undefined && !city)
    return "Estás armando tu experiencia";

  const apertura = data.mealTime ? (data.mealTime === "dinner" ? "Cena" : "Comida") : "Experiencia";
  const cocina = data.cuisine
    ? ` ${CUISINE_PHRASE[data.cuisine] ?? CUISINE_LABELS[data.cuisine]?.toLowerCase() ?? data.cuisine}`
    : "";
  const personas = data.guestsAdults !== undefined ? ` para ${data.guestsAdults}` : "";
  return `${apertura}${cocina}${personas}${city}`;
}

/**
 * Ficha de resumen progresivo (solo lectura).
 * Lee del estado compartido del wizard y muestra cada dato del pedido como un
 * slot con ícono, label y valor; los pasos pendientes aparecen atenuados como
 * "Por definir". Desplegada por defecto, colapsable a solo la cabecera.
 */
export function WizardSummaryBar({ data }: { data: WizardData }) {
  const [open, setOpen] = useState(true);
  const items = buildItems(data);
  if (items.length === 0) return null;

  const completados = items.filter((i) => i.value !== undefined).length;

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.22)] animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Cabecera: micro-label + oración compuesta + flecha para plegar/desplegar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full cursor-pointer px-5 pt-4 pb-3.5 text-left transition-colors hover:bg-zinc-50/70 sm:px-6 sm:pt-5 sm:pb-4"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
            Tu experiencia
            <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-zinc-400">
              {completados} de {items.length}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
            strokeWidth={2}
          />
        </div>
        <p className="mt-1.5 font-serif text-xl leading-snug text-zinc-900 sm:text-2xl">
          {buildHeadline(data)}
        </p>
      </button>

      {/* Contenido colapsable (transición suave de alto) */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-zinc-100 px-5 py-4 sm:gap-y-5 sm:px-6 sm:py-5 md:grid-cols-3">
            {items.map(({ key, Icon, label, value }) => {
              const done = value !== undefined;
              return (
                <div key={key} className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                      done
                        ? "bg-accent/12 ring-1 ring-accent/25"
                        : "border border-dashed border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${done ? "text-accent" : "text-zinc-300"}`} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[10px] font-semibold uppercase tracking-[0.14em] ${done ? "text-zinc-400" : "text-zinc-300"}`}>
                      {label}
                    </span>
                    {done ? (
                      <span className="block font-serif text-[15px] leading-snug text-zinc-900 animate-in fade-in duration-300">
                        {value}
                      </span>
                    ) : (
                      <span className="block font-serif text-[15px] italic leading-snug text-zinc-300">
                        Por definir
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
