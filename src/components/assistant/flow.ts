// Configuración y lógica pura del flujo conversacional del asistente.
// Compartido por dos superficies:
//   · ChefAssistant  → sección "descubrir chefs" de la home (muestra chefs)
//   · AssistantEntry → puerta de entrada full-screen a la solicitud (piloto Servicio 1)
// Sin JSX acá: solo tipos, datos y helpers, para que ambas superficies
// consuman una única fuente de verdad.

import { Heart, PartyPopper, CalendarDays, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Phase = "occasion" | "cuisine" | "meals" | "guests" | "dietary" | "results";

export type Answers = {
  serviceType: "single" | "weekly" | null;
  wizardService: string | null; // "1" | "3" | null
  occasion: string | null;
  cuisine: string | null;
  mealsPerWeek: string | null;
  guestsRange: string | null;
  guestsNum: number | null;
  dietary: string[];
};

export type Step = { key: Exclude<Phase, "results">; label: string; question: string };

export const STEP_DEFS: Record<Exclude<Phase, "results">, Step> = {
  occasion: { key: "occasion", label: "Ocasión",    question: "¿Qué ocasión estás imaginando?" },
  cuisine:  { key: "cuisine",  label: "Cocina",     question: "¿Qué cocina te tienta?" },
  meals:    { key: "meals",    label: "Comidas",    question: "¿Cuántas comidas por semana?" },
  guests:   { key: "guests",   label: "Comensales", question: "¿Cuántos a la mesa?" },
  dietary:  { key: "dietary",  label: "Detalles",   question: "¿Alguna preferencia en la cocina?" },
};

// El flujo semanal cambia "Cocina" (no aplica) por "Comidas por semana".
export const stepsFor = (serviceType: Answers["serviceType"]): Step[] =>
  serviceType === "weekly"
    ? [STEP_DEFS.occasion, STEP_DEFS.meals, STEP_DEFS.guests, STEP_DEFS.dietary]
    : [STEP_DEFS.occasion, STEP_DEFS.cuisine, STEP_DEFS.guests, STEP_DEFS.dietary];

export type OccasionOption = {
  Icon: LucideIcon;
  label: string;
  desc: string;
  serviceType: Answers["serviceType"];
  wizardService: string | null;
  occasion: string | null;
};

export const OCCASION_OPTIONS: OccasionOption[] = [
  { Icon: Heart,        label: "Cena romántica",    desc: "Una noche íntima",        serviceType: "single", wizardService: "1",  occasion: "romantic_dinner" },
  { Icon: PartyPopper,  label: "Evento especial",   desc: "Celebración a lo grande", serviceType: "single", wizardService: "1",  occasion: "corporate" },
  { Icon: CalendarDays, label: "Comidas semanales", desc: "Tu chef cada semana",     serviceType: "weekly", wizardService: "3",  occasion: null },
  { Icon: Compass,      label: "Solo explorar",     desc: "Mostrame opciones",       serviceType: null,     wizardService: null, occasion: null },
];

export const MEALS_OPTIONS = [
  { label: "4 comidas", sub: "Algunos días",    value: "4" },
  { label: "5 comidas", sub: "Días de semana",  value: "5" },
  { label: "7 comidas", sub: "Toda la semana",  value: "7" },
  { label: "A definir", sub: "Lo vemos juntos", value: null },
];

export const GUESTS_OPTIONS = [
  { label: "Solo 2",   sub: "Pareja",      range: "2",    num: 2 },
  { label: "3 a 6",    sub: "Mesa chica",  range: "3-6",  num: 6 },
  { label: "7 a 12",   sub: "Reunión",     range: "7-12", num: 12 },
  { label: "13 o más", sub: "Gran evento", range: "13+",  num: 13 },
];

// chip del asistente → valor de restricción que entiende el wizard
export const DIETARY_OPTIONS = [
  { label: "Vegetariano", value: "Vegetariano" },
  { label: "Vegano",      value: "Vegano" },
  { label: "Sin gluten",  value: "Gluten" },
  { label: "Sin lactosa", value: "Lácteos" },
];

export const INITIAL_ANSWERS: Answers = {
  serviceType: null, wizardService: null, occasion: null,
  cuisine: null, mealsPerWeek: null, guestsRange: null, guestsNum: null, dietary: [],
};

export type HistoryEntry = { label: string; answer: string };

// Construye la URL de handoff al wizard con el pre-llenado del asistente.
// `source` etiqueta el origen (p. ej. "assistant") para medir conversión del piloto.
export function buildWizardUrl(a: Answers, source?: string): string {
  const p = new URLSearchParams();
  if (a.wizardService) p.set("service", a.wizardService);
  if (a.occasion)      p.set("occasion", a.occasion);
  if (a.guestsRange)   p.set("guests", a.guestsRange);
  if (a.cuisine)       p.set("cuisine", a.cuisine);
  if (a.mealsPerWeek)  p.set("meals", a.mealsPerWeek);
  if (a.dietary.length) p.set("dietary", a.dietary.join(","));
  if (source)          p.set("source", source);
  const qs = p.toString();
  return qs ? `/wizard?${qs}` : "/wizard";
}
