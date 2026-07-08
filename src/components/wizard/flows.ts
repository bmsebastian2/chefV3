// Composición de los flujos del wizard (tronco común + ramas por servicio).
//
// Etapa 1 de la unificación: este módulo pasa a ser la única fuente de verdad
// del orden de pasos. Los arrays de acá reproducen EXACTAMENTE el orden que
// tenía page.tsx — cualquier reordenación (Etapa 2 en adelante) se hace en
// este archivo, nunca en el motor.
//
// Contrato de guardado: cada paso escribe en su campo de WizardData y el
// destino en Supabase lo decide el submit (app/wizard/actions.ts). Cambiar el
// orden de estos arrays NO cambia dónde se persiste cada dato.

import type { ComponentType } from "react";
import type { StepProps } from "./types";
import {
  StepServiceType,
  StepLocation,
  StepOccasion,
  StepOccasion1,
  StepGuests,
  StepGuestsCount,
  StepDateRange,
  StepMealSlots,
  StepMealTime,
  StepDateCalendar,
  StepCuisine,
  StepBudgetTier,
  StepBudgetMultiple,
  StepDietarySimple,
  StepDetails,
  StepContact,
  StepContact1,
} from "./Steps";

export interface FlowStep {
  id: string;
  component: ComponentType<StepProps>;
  title: string;
}

// ── Pasos del tronco común (compartidos tal cual entre servicios) ─────────────
const serviceType: FlowStep = {
  id: "serviceType",
  component: StepServiceType,
  title: "¿Qué tipo de servicio de chef necesitas?",
};

const location: FlowStep = {
  id: "location",
  component: StepLocation,
  title: "¿Dónde será el evento?",
};

const dietary: FlowStep = {
  id: "dietary",
  component: StepDietarySimple,
  title: "¿Alguna restricción alimentaria?",
};

// ── Flujo Servicio 1 · Experiencia Culinaria Única (piloto del tronco común) ──
// Orden tronco: tipo → ocasión → ubicación → [rama fechas: fecha + momento] →
// personas → restricciones → cocina → descripción → presupuesto → contacto.
const flowService1: FlowStep[] = [
  serviceType,
  { id: "occasion", component: StepOccasion1,    title: "¿Cuál es la ocasión?" },
  location,
  { id: "date",     component: StepDateCalendar, title: "¿Cuándo?" },
  { id: "mealTime", component: StepMealTime,     title: "¿A qué hora?" },
  { id: "guests",   component: StepGuestsCount,  title: "¿Para cuántas personas?" },
  dietary,
  { id: "cuisine",  component: StepCuisine,      title: "¿Qué te apetece?" },
  { id: "details",  component: StepDetails,      title: "Por último, describe tu evento" },
  { id: "budget",   component: StepBudgetTier,   title: "¿Cuál es tu presupuesto para esta experiencia?" },
  { id: "contact",  component: StepContact1,     title: "¡Ya está!" },
];

// ── Flujo Servicio 2 · Varios Servicios (orden tronco) ────────────────────────
// Tronco: tipo → ocasión → ubicación → [rama fechas: rango + slots] →
// personas → restricciones → descripción → presupuesto → contacto.
const flowService2: FlowStep[] = [
  serviceType,
  { id: "occasion",  component: StepOccasion,       title: "¿Cuál es la ocasión?" },
  location,
  { id: "dateRange", component: StepDateRange,      title: "¿Cuándo necesitarás el servicio?" },
  { id: "mealSlots", component: StepMealSlots,      title: "Quiero disfrutar del servicio los días" },
  { id: "guests",    component: StepGuests,         title: "Somos" },
  dietary,
  { id: "details",   component: StepDetails,        title: "Describe tu evento" },
  { id: "budget",    component: StepBudgetMultiple, title: "¿Cuál es tu presupuesto para esta experiencia?" },
  { id: "contact",   component: StepContact,        title: "¡Ya está!" },
];

// ── Flujo base (todavía sin tipo de servicio elegido) ─────────────────────────
// El Servicio 3 (semanal) sigue viviendo en WeeklyMealsForm fuera del motor;
// se incorpora acá en la Etapa 5.
const baseFlow: FlowStep[] = [serviceType];

export function getStepsForService(service?: string): FlowStep[] {
  if (service === "1") return flowService1;
  if (service === "2") return flowService2;
  return baseFlow;
}
