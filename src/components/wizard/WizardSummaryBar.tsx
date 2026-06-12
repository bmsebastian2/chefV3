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

const GUESTS_LABELS: Record<string, string> = {
  "2": "2 personas", "3-6": "3–6 personas", "7-12": "7–12 personas", "13+": "13+ personas",
};

const CUISINE_LABELS: Record<string, string> = {
  local: "Local", italian: "Italiana", mediterranean: "Mediterránea",
  seafood: "Mariscos", french: "Francesa", japanese: "Japonesa",
  fusion: "Fusión", chefs_special: "Especial del chef",
};

const TIER_LABELS: Record<string, string> = {
  casual: "Casual", gourmet: "Gourmet", exclusive: "Selección exclusiva",
};

interface Chip {
  key: string;
  Icon: LucideIcon;
  label: string;
}

/**
 * Barra de resumen progresivo (solo lectura).
 * Lee del estado compartido del wizard y muestra como píldoras únicamente
 * los datos ya completados — los pasos pendientes no aparecen.
 */
export function WizardSummaryBar({ data }: { data: WizardData }) {
  const [open, setOpen] = useState(false);
  const chips: Chip[] = [];

  const isService2 = data.serviceType === "2";
  const isService3 = data.serviceType === "3";

  // Ubicación (común a los tres servicios)
  if (data.location?.city)
    chips.push({ key: "location", Icon: MapPin, label: data.location.city });

  // Ocasión: servicio 1 guarda claves; servicio 2 guarda el texto directo.
  // El servicio 3 (semanal) no tiene ocasión.
  if (data.occasion)
    chips.push({
      key: "occasion",
      Icon: PartyPopper,
      label: isService2 ? data.occasion : (OCCASION_LABELS[data.occasion] ?? data.occasion),
    });

  if (isService3) {
    // Servicio 3 — comidas semanales
    const wd = data.weeklyDetails;
    if (wd?.comidasPorSemana !== undefined)
      chips.push({ key: "meals", Icon: UtensilsCrossed, label: `${wd.comidasPorSemana} comidas` });

    if (wd?.racionesPorComida !== undefined) {
      const r = wd.racionesPorComida;
      chips.push({ key: "guests", Icon: Users, label: `${r} ${r === 1 ? "persona" : "personas"}` });
    }

    const dias = wd?.frecuenciaCocina ?? [];
    if (dias.length)
      chips.push({ key: "freq", Icon: Repeat, label: `${dias.length} ${dias.length === 1 ? "día" : "días"}/sem` });

    if (data.date)
      chips.push({ key: "start", Icon: CalendarDays, label: `Desde ${format(new Date(data.date), "d MMM", { locale: es })}` });
  } else if (isService2) {
    // Rango de fechas
    if (data.dateRangeStart && data.dateRangeEnd) {
      const ini = format(new Date(data.dateRangeStart), "d MMM", { locale: es });
      const fin = format(new Date(data.dateRangeEnd), "d MMM", { locale: es });
      chips.push({ key: "dateRange", Icon: CalendarDays, label: ini === fin ? ini : `${ini} – ${fin}` });
    }

    // Comidas seleccionadas (suma de desayuno/almuerzo/cena en todos los días)
    const totalComidas = (data.mealSlots ?? []).reduce(
      (n, s) => n + (s.desayuno ? 1 : 0) + (s.almuerzo ? 1 : 0) + (s.cena ? 1 : 0),
      0,
    );
    if (totalComidas > 0)
      chips.push({ key: "meals", Icon: UtensilsCrossed, label: `${totalComidas} comidas` });

    // Personas (adultos + adolescentes + niños)
    if (data.guestsAdults !== undefined) {
      const total = (data.guestsAdults ?? 0) + (data.guestsTeens ?? 0) + (data.guestsKids ?? 0);
      chips.push({ key: "guests", Icon: Users, label: `${total} ${total === 1 ? "persona" : "personas"}` });
    }
  } else {
    // Servicio 1
    if (data.guestsRange)
      chips.push({ key: "guests", Icon: Users, label: GUESTS_LABELS[data.guestsRange] ?? data.guestsRange });

    if (data.mealTime)
      chips.push({
        key: "mealTime",
        Icon: data.mealTime === "dinner" ? Moon : Sun,
        label: data.mealTime === "dinner" ? "Cena" : "Comida",
      });

    if (data.cuisine)
      chips.push({ key: "cuisine", Icon: UtensilsCrossed, label: CUISINE_LABELS[data.cuisine] ?? data.cuisine });

    if (data.date)
      chips.push({ key: "date", Icon: CalendarDays, label: format(new Date(data.date), "d MMM", { locale: es }) });
  }

  // Presupuesto / tipo de propuesta (común — ambos usan budgetTier)
  if (data.budgetTier)
    chips.push({ key: "budget", Icon: Sparkles, label: TIER_LABELS[data.budgetTier] ?? data.budgetTier });

  // Restricciones: ["Ninguna"] | ["Sí", ...reales] | ["Sí"]
  const restricciones = data.dietaryRestrictions ?? [];
  const restriccionesReales = restricciones.filter((r) => r !== "Sí" && r !== "Ninguna");
  const restriccionLabel = restricciones[0] === "Ninguna"
    ? "Sin restricciones"
    : restriccionesReales.join(", ");
  if (restriccionLabel)
    chips.push({ key: "dietary", Icon: Salad, label: restriccionLabel });

  if (chips.length === 0) return null;

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-xl mb-8 overflow-hidden">
      {/* Cabecera: etiqueta + flecha para plegar/desplegar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 text-left cursor-pointer hover:bg-accent/[0.03] transition-colors"
      >
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-accent">
          Tu pedido
          <span className="ml-1.5 text-zinc-400 font-medium">{chips.length}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
      </button>

      {/* Contenido colapsable (transición suave de alto) */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 sm:px-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {chips.map(({ key, Icon, label }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white border border-accent/15 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <Icon className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                <span className="text-[13px] font-medium text-zinc-800 whitespace-nowrap">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
