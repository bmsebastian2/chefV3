"use client";

// Pasos de la rama semanal para el motor común (firma StepProps).
// Etapa 5b de la unificación: componen las piezas de los WeeklyStep* viejos
// (Stepper, InlineCalendar) SIN header propio — la pregunta la pone el motor
// desde flows.ts. Los WeeklyStep* originales siguen intactos sosteniendo el
// flujo viejo hasta el switch (5c); se borran en la limpieza (5e).
//
// Contrato de guardado (idéntico al flujo viejo):
//   comidasPorSemana / racionesPorComida / frecuenciaCocina / preferenciaChef /
//   preferenciasCulinarias → weeklyDetails.* → weekly_meal_details
//   date → event_date_start · racionesPorComida además → guests_adults

import { useState } from "react";
import { StepProps } from "./types";
import { Stepper } from "./WeeklyStep3Volume";
import { InlineCalendar, DAYS_OF_WEEK } from "./WeeklyStep5Schedule";

const BTN_NEXT =
  "w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed";

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Confirmación de condiciones del servicio semanal ──────────────────────────
export function WeeklyStepConfirm({ nextStep }: StepProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <div className="border-l-2 border-accent bg-accent/5 rounded-xl p-5 mb-6">
        <p className="text-sm text-zinc-700 leading-relaxed">
          Cada semana, un chef profesional se desplazará hasta tu hogar para preparar una gran
          variedad de platos en una única sesión de cocina, dejándote todo listo y organizado
          para varios días. Dependiendo del volumen del servicio, la sesión puede extenderse
          entre 3 y 5 horas. El costo parte desde <span className="font-semibold text-zinc-900">$300 USD</span> o
          su valor equivalente en moneda local.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        className={[
          "flex items-center gap-4 w-full px-4 h-14 rounded-xl border text-left transition-all duration-200 mb-10",
          agreed ? "border-accent/40 bg-accent/5" : "border-zinc-200 bg-white hover:border-zinc-300",
        ].join(" ")}
      >
        <span
          className={[
            "flex-shrink-0 w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all duration-150",
            agreed ? "bg-accent border-accent text-white" : "bg-white border-zinc-300",
          ].join(" ")}
        >
          {agreed && <CheckIcon />}
        </span>
        <span className="text-sm font-medium text-zinc-800">Estoy de acuerdo</span>
      </button>

      <button type="button" onClick={nextStep} disabled={!agreed} className={BTN_NEXT}>
        Continuar
      </button>
    </div>
  );
}

// ── Comidas por semana (rama de fechas/frecuencia, 1 de 2) ────────────────────
export function WeeklyStepMeals({ data, updateData, nextStep }: StepProps) {
  const [comidas, setComidas] = useState(data.weeklyDetails?.comidasPorSemana ?? 7);

  const handleContinue = () => {
    updateData({ weeklyDetails: { ...data.weeklyDetails, comidasPorSemana: comidas } });
    nextStep();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <div className="mb-8">
        <Stepper label="Comidas por semana" value={comidas} min={4} max={14} onChange={setComidas} />
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-10">
        <p className="text-sm text-zinc-700 leading-relaxed">
          Tu chef preparará{" "}
          <span className="font-semibold text-accent">
            {comidas} {comidas === 1 ? "comida" : "comidas"}
          </span>{" "}
          cada semana.
        </p>
      </div>

      <button type="button" onClick={handleContinue} className={BTN_NEXT}>
        Continuar
      </button>
    </div>
  );
}

// ── Fecha de inicio + día preferido (rama de fechas/frecuencia, 2 de 2) ───────
export function WeeklyStepSchedule({ data, updateData, nextStep }: StepProps) {
  const selectedDate = data.date;
  const selectedDays = data.weeklyDetails?.frecuenciaCocina ?? [];
  const canContinue  = !!selectedDate && selectedDays.length > 0;

  const handleDaySelect = (id: number) => {
    const updated = selectedDays.includes(id)
      ? selectedDays.filter((d) => d !== id)
      : [...selectedDays, id];
    updateData({ weeklyDetails: { ...data.weeklyDetails, frecuenciaCocina: updated } });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-4">
        Fecha ideal de inicio
      </p>
      <div className="border border-zinc-100 rounded-2xl p-4 mb-8 bg-white">
        <InlineCalendar selected={selectedDate} onSelect={(d) => updateData({ date: d })} />
      </div>

      <div className="h-px bg-zinc-100 mb-8" />

      <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1.5">
        Día preferido para la sesión
      </p>
      <p className="text-sm text-zinc-500 mb-4">
        ¿Qué día preferís que el chef vaya a cocinar?
      </p>
      <div
        className="overflow-x-auto pb-1 mb-10"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        <div className="flex gap-2 w-max">
          {DAYS_OF_WEEK.map(({ id, initial, label }) => {
            const active = selectedDays.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleDaySelect(id)}
                className={[
                  "flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all duration-150 flex-shrink-0 select-none",
                  active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                ].join(" ")}
              >
                <span className={`font-serif text-lg leading-none ${active ? "text-white" : "text-zinc-800"}`}>
                  {initial}
                </span>
                <span className={`text-[9px] uppercase tracking-wide mt-1 ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={nextStep} disabled={!canContinue} className={BTN_NEXT}>
        Continuar
      </button>
    </div>
  );
}

// ── Personas por comida (variante semanal del paso de personas del tronco) ────
// Mismo lugar del tronco que StepGuestsCount, pero escribe racionesPorComida
// (→ raciones_por_comida; el submit además lo persiste en guests_adults).
export function WeeklyStepGuests({ data, updateData, nextStep }: StepProps) {
  const [raciones, setRaciones] = useState(data.weeklyDetails?.racionesPorComida ?? 2);

  const handleContinue = () => {
    updateData({ weeklyDetails: { ...data.weeklyDetails, racionesPorComida: raciones } });
    nextStep();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <div className="mb-10">
        <Stepper label="Personas por comida" value={raciones} min={1} max={10} onChange={setRaciones} />
      </div>
      <button type="button" onClick={handleContinue} className={BTN_NEXT}>
        Continuar
      </button>
    </div>
  );
}

// ── Compra de ingredientes (rama semanal, tras restricciones) ─────────────────
const INGREDIENTES_OPTS = [
  { id: "si",        label: "Sí" },
  { id: "no",        label: "No" },
  { id: "no_seguro", label: "No estoy seguro/a" },
];

export function WeeklyStepIngredients({ data, updateData, nextStep }: StepProps) {
  const selected = data.weeklyDetails?.preferenciaChef ?? "";

  const pick = (id: string) => {
    updateData({ weeklyDetails: { ...data.weeklyDetails, preferenciaChef: id } });
    nextStep();
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <p className="text-sm text-zinc-500 text-center mb-6">
        ¿Te gustaría que el chef se encargara de comprar los ingredientes?
      </p>
      <div className="flex flex-col gap-2">
        {INGREDIENTES_OPTS.map(({ id, label }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              className={[
                "flex items-center justify-between px-4 h-14 rounded-xl border text-sm font-medium transition-all duration-150",
                active
                  ? "border-accent/40 bg-accent/5 text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
              ].join(" ")}
            >
              <span>{label}</span>
              {active && <span className="text-accent"><CheckIcon /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Preferencias culinarias (variante semanal del paso de descripción) ────────
// Escribe weeklyDetails.preferenciasCulinarias (→ descripcion_evento +
// weekly_meal_details.preferencias_culinarias, doble destino actual).
export function WeeklyStepPreferences({ data, updateData, nextStep }: StepProps) {
  const notas = data.weeklyDetails?.preferenciasCulinarias ?? "";

  return (
    <div className="flex flex-col gap-6 items-center max-w-md mx-auto w-full">
      <textarea
        placeholder="Cuéntanos un poco más sobre tus preferencias culinarias, objetivos alimenticios o cualquier detalle que nos ayude a encontrar el chef ideal para ti."
        className="w-full min-h-[160px] p-4 text-base border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 resize-none font-sans shadow-sm transition-all"
        value={notas}
        onChange={(e) =>
          updateData({ weeklyDetails: { ...data.weeklyDetails, preferenciasCulinarias: e.target.value } })
        }
      />
      <button type="button" onClick={nextStep} className={BTN_NEXT}>
        Continuar
      </button>
    </div>
  );
}
