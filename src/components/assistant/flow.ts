// Configuración y lógica pura del flujo conversacional del asistente.
// Consumida por AssistantEntry, única implementación (home y /asistente).
// Sin JSX acá: solo tipos, datos y helpers.

import { PartyPopper, CalendarRange, Soup } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Answers = {
  serviceType: "single" | "multiple" | "weekly" | null;
  wizardService: string | null; // "1" | "2" | "3" | null
  occasion: string | null;
  cuisine: string | null;
  mealsPerWeek: string | null;
  guestsRange: string | null;
  guestsNum: number | null;
  dietary: string[] | null; // null = aún no respondió; [] = respondió "sin restricciones"
};

// ── Tipo de servicio: primer paso del asistente (ramifica todo el flujo) ──────
export type ServiceOption = {
  Icon: LucideIcon;
  label: string;
  desc: string;
  serviceType: Exclude<Answers["serviceType"], null>;
  wizardService: string; // "1" | "2" | "3"
};

export const SERVICE_OPTIONS: ServiceOption[] = [
  { Icon: PartyPopper,   label: "Un evento especial",   desc: "Un chef privado para una fecha",             serviceType: "single",   wizardService: "1" },
  { Icon: CalendarRange, label: "Varios días",          desc: "Un chef para varias fechas seguidas",        serviceType: "multiple", wizardService: "2" },
  { Icon: Soup,          label: "Comidas de la semana", desc: "Un chef que cocina tus comidas cada semana", serviceType: "weekly",   wizardService: "3" },
];

// ── Ocasiones del paso "ocasión" de AssistantEntry (rama de evento único) ─────
// Progressive disclosure: las frecuentes visibles como chips, el resto detrás
// de "Otra ocasión". Los slugs deben existir en el CHECK de
// service_requests.occasion; las ocasiones sin slug propio persisten como "other"
// (la etiqueta elegida o escrita solo vive en la conversación del asistente).
export type EntryOccasion = { label: string; occasion: string };

export const OCCASION_CHIPS: EntryOccasion[] = [
  { label: "Cena romántica",             occasion: "romantic_dinner" },
  { label: "Cumpleaños",                 occasion: "birthday" },
  { label: "Reunión con amigos/familia", occasion: "friends_gathering" },
];

export const OCCASION_CHIPS_MORE: EntryOccasion[] = [
  { label: "Aniversario",              occasion: "other" },
  { label: "Cena de negocios",         occasion: "corporate" },
  { label: "Celebración de temporada", occasion: "other" },
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
  cuisine: null, mealsPerWeek: null, guestsRange: null, guestsNum: null, dietary: null,
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
  // "none" = respondió explícitamente "sin restricciones" (el wizard salta el paso);
  // sin param = nunca llegó a la pregunta (el wizard la hace).
  if (a.dietary) p.set("dietary", a.dietary.length ? a.dietary.join(",") : "none");
  if (source)          p.set("source", source);
  const qs = p.toString();
  return qs ? `/wizard?${qs}` : "/wizard";
}
